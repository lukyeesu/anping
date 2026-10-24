package com.anping.cardagent

import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors

data class StatusInfo(
    val deviceConnected: Boolean,
    val readerName: String,
    val hasCard: Boolean
)

class LocalHttpServer(
    private val port: Int = 8181,
    private val onReadCardRequested: (Boolean) -> CardModel?,
    private val onStatusRequested: () -> StatusInfo
) {
    companion object {
        private const val TAG = "LocalHttpServer"
    }

    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val executor = Executors.newFixedThreadPool(4)

    fun start() {
        if (isRunning) return
        isRunning = true

        Thread {
            try {
                // ผูก Server กับ Loopback Interface (127.0.0.1) เท่านั้น เพื่อความปลอดภัย 100% ป้องกันภายนอกเข้าถึง
                val loopback = InetAddress.getByName("127.0.0.1")
                serverSocket = ServerSocket(port, 50, loopback)
                Log.i(TAG, "Local HTTP Server started on 127.0.0.1:$port")

                while (isRunning && serverSocket != null && !serverSocket!!.isClosed) {
                    val clientSocket = serverSocket!!.accept()
                    executor.execute { handleClient(clientSocket) }
                }
            } catch (e: java.net.BindException) {
                Log.w(TAG, "Port $port is already bound by another agent. Using existing agent server.")
                isRunning = false
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e(TAG, "Server error: ${e.message}")
                }
            }
        }.start()
    }

    private fun handleClient(socket: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val writer = PrintWriter(socket.getOutputStream(), true)

            val requestLine = reader.readLine() ?: return
            val parts = requestLine.split(" ")
            if (parts.size < 2) return

            val method = parts[0]
            val path = parts[1]

            // 1. ตอบสนองต่อคำขอ CORS Pre-flight (OPTIONS)
            if (method.equals("OPTIONS", ignoreCase = true)) {
                sendResponse(writer, 200, "OK", "text/plain", "")
                socket.close()
                return
            }

            // 2. จัดการ Endpoint /api/status (สำหรับเช็คสถานะว่าเปิดแอปมั้ย / เสียบสายมั้ย / เสียบบัตรมั้ย)
            if (path.startsWith("/api/status")) {
                val status = onStatusRequested()
                val json = JSONObject()
                json.put("status", "ok")
                json.put("server", "Anping Smart Card Agent (Android)")
                json.put("deviceConnected", status.deviceConnected)
                json.put("readerName", status.readerName)
                json.put("hasCard", status.hasCard)
                sendResponse(writer, 200, "OK", "application/json; charset=utf-8", json.toString())
                socket.close()
                return
            }

            // 3. จัดการ Endpoint /api/read-card
            if (path.startsWith("/api/read-card")) {
                val status = onStatusRequested()
                if (!status.deviceConnected) {
                    val errJson = JSONObject()
                    errJson.put("status", "error")
                    errJson.put("error", "ไม่พบอุปกรณ์อ่านบัตร: กรุณาเสียบสายเครื่องอ่านบัตรประชาชน (USB OTG)")
                    sendResponse(writer, 503, "Service Unavailable", "application/json; charset=utf-8", errJson.toString())
                    socket.close()
                    return
                }

                // ถ้า URL มีพารามิเตอร์ photo=true หรือ includePhoto=true ให้อ่านรูปภาพใบหน้าด้วย
                val includePhoto = path.contains("photo=true") || path.contains("includePhoto=true")
                val cardData = onReadCardRequested(includePhoto)
                if (cardData != null) {
                    sendResponse(writer, 200, "OK", "application/json; charset=utf-8", cardData.toJson().toString())
                } else {
                    val isPresent = status.hasCard
                    val errJson = JSONObject()
                    errJson.put("status", "error")
                    if (!isPresent) {
                        errJson.put("error", "กรุณาเสียบบัตรประชาชนให้แน่น แล้วกดอ่านใหม่อีกครั้ง")
                        sendResponse(writer, 404, "Not Found", "application/json; charset=utf-8", errJson.toString())
                    } else {
                        errJson.put("error", "ไม่สามารถอ่านบัตรได้ กรุณาเสียบบัตรให้แน่นหรือทำความสะอาดหน้าสัมผัสชิป")
                        sendResponse(writer, 500, "Internal Server Error", "application/json; charset=utf-8", errJson.toString())
                    }
                }
                socket.close()
                return
            }

            // Endpoint อื่นๆ ไม่พบ
            sendResponse(writer, 404, "Not Found", "text/plain", "Not Found")
            socket.close()
        } catch (e: Exception) {
            Log.e(TAG, "Client handle error: ${e.message}")
            try { socket.close() } catch (_: Exception) {}
        }
    }

    private fun sendResponse(writer: PrintWriter, statusCode: Int, statusText: String, contentType: String, body: String) {
        writer.print("HTTP/1.1 $statusCode $statusText\r\n")
        writer.print("Content-Type: $contentType\r\n")
        writer.print("Content-Length: ${body.toByteArray(Charsets.UTF_8).size}\r\n")
        writer.print("Access-Control-Allow-Origin: *\r\n")
        writer.print("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
        writer.print("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With\r\n")
        writer.print("Access-Control-Allow-Private-Network: true\r\n")
        writer.print("Connection: close\r\n")
        writer.print("\r\n")
        writer.print(body)
        writer.flush()
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server: ${e.message}")
        }
    }
}
