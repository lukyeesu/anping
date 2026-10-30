package com.anping.cardagent

import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import org.json.JSONObject

/** Serve this APK's optimized web snapshot on the clinic's existing HTTPS origin. */
class BundledWebContent(context: Context, private val host: String) {
    private val assets = context.applicationContext.assets
    private val manifest = runCatching {
        assets.open("web/asset-manifest.json").bufferedReader().use { JSONObject(it.readText()) }
    }.getOrNull()
    private val files = manifest?.optJSONObject("files")

    fun intercept(request: WebResourceRequest): WebResourceResponse? {
        return try {
            val uri = request.url ?: return null
            if (uri.scheme != "https" || uri.host != host || (uri.port != -1 && uri.port != 443) || request.method != "GET") return null
            val path = uri.path ?: "/"
            // APIs, updates and downloads always use the server; only known packaged files are served locally.
            if (path == "/api" || path.startsWith("/api/") || path.endsWith(".apk") || path.endsWith(".json")) return null
            val document = request.isForMainFrame && (path == "/" || !path.substringAfterLast('/').contains('.'))
            val key = if (document) "/index.html" else path
            val info = files?.optJSONObject(key) ?: return null
            val stream = runCatching { assets.open("web${key}") }.getOrNull() ?: return null
            val mime = info.optString("mime", "application/octet-stream")
            val encoding = if (mime.startsWith("text/") || mime.contains("javascript") || mime.contains("svg")) "UTF-8" else null
            val version = manifest?.optString("version", "1.6.29") ?: "1.6.29"
            val headers = mutableMapOf(
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to if (key.startsWith("/assets/")) "public, max-age=31536000, immutable" else "no-store",
                "X-Anping-Web-Build" to version
            )
            WebResourceResponse(mime, encoding, 200, "OK", headers, stream)
        } catch (_: Throwable) {
            null
        }
    }
}
