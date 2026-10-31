package com.anping.cardagent

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.PendingIntent
import android.content.*
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Base64
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.*
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.anping.cardagent.databinding.ActivityMainBinding
import com.google.android.material.bottomsheet.BottomSheetDialog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "AnpingClinicApp"
        private const val CLINIC_URL = "https://anpingclinic.vercel.app"
        private const val ACTION_USB_PERMISSION = "com.anping.cardagent.USB_PERMISSION"
        private const val PERMISSION_REQUEST_CAMERA = 1001

        var isActivityVisible: Boolean = false
            private set
    }

    private lateinit var binding: ActivityMainBinding
    private var usbManager: UsbManager? = null
    private var cardService: CardReaderService? = null
    private var isBound = false
    private val bundledWebContent by lazy { BundledWebContent(this, Uri.parse(CLINIC_URL).host!!) }
    private var lastBackPressTime: Long = 0
    @Volatile private var canWebScrollUp: Boolean = true
    private var activeWebView: WebView? = null
    private fun getActiveWebView(): WebView = activeWebView ?: binding.webView

    // File Chooser สำหรับกล้องและรูปภาพ
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val intent = result.data
            val clipData = intent?.clipData
            val uris = when {
                clipData != null -> Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                intent?.data != null -> arrayOf(intent.data!!)
                cameraPhotoUri != null -> arrayOf(cameraPhotoUri!!)
                else -> null
            }
            fileUploadCallback?.onReceiveValue(uris)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as CardReaderService.LocalBinder
            cardService = binder.getService()
            isBound = true

            cardService?.onStatusChanged = { connected, readerName, hasCard ->
                runOnUiThread { updateReaderStatusPill(connected, readerName, hasCard) }
            }

            // เมื่อเสียบบัตรและอ่านสำเร็จ นำส่งข้อมูลเข้าสู่ WebView พร้อมแจ้งเตือน Toast สั้นๆ
            cardService?.onCardAutoRead = { card ->
                runOnUiThread {
                    notifyWebCardInserted(card)
                    Toast.makeText(this@MainActivity, "อ่านข้อมูลจากบัตรประชาชนสำเร็จ", Toast.LENGTH_SHORT).show()
                }
            }

            cardService?.onCardRemoved = {
                runOnUiThread {
                    notifyWebCardRemoved()
                    Toast.makeText(this@MainActivity, "ถอดบัตรประชาชนออกแล้ว", Toast.LENGTH_SHORT).show()
                }
            }

            cardService?.checkConnectedDevices()
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            cardService = null
            isBound = false
        }
    }

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let {
                                if (cardService?.isSmartCardReader(it) == true) {
                                    cardService?.attachDevice(it)
                                }
                            }
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let {
                        if (cardService?.isSmartCardReader(it) == true) {
                            if (usbManager?.hasPermission(it) == true) {
                                cardService?.attachDevice(it)
                            } else {
                                requestUsbPermission(it)
                            }
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let { cardService?.detachDevice(it) }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // เปิด Hardware Acceleration เต็มประสิทธิภาพสำหรับเรนเดอร์และกล้องสแกน
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        // ล้างไฟล์อัปเดตตกค้าง (update.apk) ในแคชทันทีที่เปิดแอปเวอร์ชันใหม่ ไม่ให้รกเครื่อง
        try {
            val oldApk = File(cacheDir, "update.apk")
            if (oldApk.exists()) {
                oldApk.delete()
                Log.i(TAG, "Cleaned up old update.apk on launch")
            }
        } catch (_: Exception) {}

                // Set status bar to clean white with dark icons (Chrome-style)
        window.statusBarColor = ContextCompat.getColor(this, android.R.color.white)
        WindowCompat.getInsetsController(window, window.decorView)?.let { controller ->
            controller.isAppearanceLightStatusBars = true
            controller.isAppearanceLightNavigationBars = true
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        usbManager = getSystemService(Context.USB_SERVICE) as UsbManager

        // ตรวจจับอุปกรณ์ USB กรณีที่เปิดแอปขึ้นมาจาก Intent การเสียบสายโดยตรง
        handleUsbDeviceIntent(intent)

        // ขอสิทธิ์กล้องสำหรับระบบสแกนเอกสาร / QR / บาร์โค้ด
        checkAndRequestCameraPermission()

        // ตั้งค่า WebView
        setupWebView()

        // ตั้งค่าคลิกที่ป้ายสถานะเครื่องอ่าน เพื่อเปิดดูข้อมูลบัตรฉบับเต็มบน Web App
        binding.cardReaderPill.setOnClickListener {
            getActiveWebView().evaluateJavascript("""
                (function() {
                    try {
                        window.dispatchEvent(new CustomEvent('open-card-inspector'));
                    } catch(e) {}
                })();
            """.trimIndent(), null)
        }

        // ตั้งค่าปุ่ม Retry กรณีออฟไลน์หรือหน่วยความจำถูกรีเซ็ต
        binding.btnRetry.setOnClickListener {
            resetAndReloadWebView()
        }

        // ตั้งค่าการกดปุ่ม Back แบบป้องกันการปิดแอปโดยไม่ตั้งใจ
        setupBackNavigation()

        // เริ่มต้น Background Card Reader Service
        try {
            val serviceIntent = Intent(this, CardReaderService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting CardReaderService: ${e.message}")
        }

        // ลงทะเบียน USB Receiver
        try {
            val filter = IntentFilter().apply {
                addAction(ACTION_USB_PERMISSION)
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.registerReceiver(this, usbReceiver, filter, ContextCompat.RECEIVER_EXPORTED)
            } else {
                registerReceiver(usbReceiver, filter)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering usbReceiver: ${e.message}")
        }

        // ตรวจสอบการอัปเดตแอปอัตโนมัติ (แบบแอปธนาคาร)
        checkForAppUpdates()
    }

    private fun checkAndRequestCameraPermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                PERMISSION_REQUEST_CAMERA
            )
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(targetWebView: WebView? = null) {
        val webView = targetWebView ?: binding.webView
        activeWebView = webView

        // ตั้งค่า Pull-to-Refresh ผ่าน SwipeRefreshLayout
        binding.swipeRefreshLayout.setColorSchemeColors(
            ContextCompat.getColor(this, android.R.color.holo_blue_dark),
            ContextCompat.getColor(this, android.R.color.holo_green_dark)
        )
        binding.swipeRefreshLayout.setOnRefreshListener {
            getActiveWebView().reload()
        }
        binding.swipeRefreshLayout.setOnChildScrollUpCallback { _, _ ->
            canWebScrollUp || getActiveWebView().scrollY > 0
        }

        // ปิด offscreen layer type เพื่อให้ Chromium compositing ทำงานตรงกับ Hardware Surface (ลื่นไหล 60FPS)
        webView.setLayerType(View.LAYER_TYPE_NONE, null)
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.isNestedScrollingEnabled = false
        webView.setBackgroundColor(0xFFFFFFFF.toInt())

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            // ปิด Zoom Controls ทั้งหมดเพื่อตัด Touch Latency (0ms Touch Response ทัชติดนิ้วทันที)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            // ไม่ต้องใช้ WideViewPort/OverviewMode เพื่อไม่ให้ WebView คำนวณ Scale เพิ่มเติม
            useWideViewPort = false
            loadWithOverviewMode = false
            userAgentString = "$userAgentString AnpingClinicApp/1.6.30"
        }

        // Bridge เชื่อมต่อ Smart Card Reader แบบ Native
        webView.addJavascriptInterface(object {
            @JavascriptInterface
            fun isNativeApp(): Boolean = true

            @JavascriptInterface
            fun setCanScrollUp(canScrollUp: Boolean) {
                canWebScrollUp = canScrollUp
            }

            @JavascriptInterface
            fun setSwipeRefreshEnabled(enabled: Boolean) {
                runOnUiThread {
                    if (binding.swipeRefreshLayout.isEnabled != enabled) binding.swipeRefreshLayout.isEnabled = enabled
                }
            }

            @JavascriptInterface
            fun getReaderStatus(): String {
                val service = cardService
                val hasCard = service?.isCardPresentCached ?: false
                val connected = service?.isDeviceConnectedCached ?: false
                val obj = JSONObject()
                obj.put("connected", connected)
                obj.put("hasCard", hasCard)
                return obj.toString()
            }

            @JavascriptInterface
            fun readCardNow() {
                // รันการอ่านบัตรบน Background Thread (Dispatchers.IO) ป้องกัน Main UI Thread ค้าง (แก้ปัญหา ANR แอปไม่ตอบสนอง 100%)
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val card = cardService?.readCard(includePhoto = true)
                        if (card != null) {
                            withContext(Dispatchers.Main) {
                                notifyWebCardInserted(card)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "readCardNow error: ${e.message}")
                    }
                }
            }

            @JavascriptInterface
            fun getLatestCard(): String {
                val card = cardService?.getLatestCard()
                return card?.toJson()?.toString() ?: ""
            }

            @JavascriptInterface
            fun showCardInspector() {
                runOnUiThread {
                    getActiveWebView().evaluateJavascript("""
                        (function() {
                            try {
                                window.dispatchEvent(new CustomEvent('open-card-inspector'));
                            } catch(e) {}
                        })();
                    """.trimIndent(), null)
                }
            }

            @JavascriptInterface
            fun openExternalBrowser(url: String) {
                runOnUiThread {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                    } catch (e: Exception) {
                        Log.e(TAG, "openExternalBrowser error: ${e.message}")
                        Toast.makeText(this@MainActivity, "ไม่สามารถเปิดเบราว์เซอร์ได้", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            // รองรับโหมดเต็มจอระดับระบบปฏิบัติการ (Immersive System Bars Fullscreen)
            private var isImmersiveFullscreen = false

            @JavascriptInterface
            fun isFullscreen(): Boolean = isImmersiveFullscreen

            @JavascriptInterface
            fun toggleFullscreen(): Boolean {
                val next = !isImmersiveFullscreen
                setFullscreen(next)
                return next
            }

            @JavascriptInterface
            fun setFullscreen(fullscreen: Boolean) {
                runOnUiThread {
                    isImmersiveFullscreen = fullscreen
                    val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)
                    if (fullscreen) {
                        windowInsetsController.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
                    } else {
                        windowInsetsController.show(WindowInsetsCompat.Type.systemBars())
                    }
                    getActiveWebView().evaluateJavascript("""
                        (function() {
                            try {
                                window.dispatchEvent(new CustomEvent('native-fullscreen-change', { detail: { isFullscreen: $fullscreen } }));
                            } catch(e) {}
                        })();
                    """.trimIndent(), null)
                }
            }
        }, "AndroidCardBridge")

        webView.webChromeClient = object : WebChromeClient() {
            private var customView: View? = null
            private var customViewCallback: CustomViewCallback? = null

            // รองรับโหมดเต็มจอของแท็ก HTML5 <video> และ requestFullscreen() ใน WebView
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                runOnUiThread {
                    if (customView != null) {
                        callback?.onCustomViewHidden()
                        return@runOnUiThread
                    }
                    customView = view
                    customViewCallback = callback
                    val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)
                    windowInsetsController.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
                    binding.root.addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                    binding.swipeRefreshLayout.visibility = View.GONE
                }
            }

            override fun onHideCustomView() {
                runOnUiThread {
                    binding.swipeRefreshLayout.visibility = View.VISIBLE
                    customView?.let { binding.root.removeView(it) }
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)
                    windowInsetsController.show(WindowInsetsCompat.Type.systemBars())
                }
            }
            // อนุมัติสิทธิ์กล้องและไมค์ทันทีเมื่อหน้าเว็บต้องการสแกนกล้อง (High Performance Camera Scanning)
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    val requestedResources = request?.resources ?: emptyArray()
                    request?.grant(requestedResources)
                    Log.i(TAG, "Granted web camera/mic permissions automatically")
                }
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.progressBar.progress = newProgress
                } else {
                    binding.progressBar.visibility = View.GONE
                }
            }

            // รองรับการเลือกรูปถ่ายหรือถ่ายรูปด้วยกล้องมือถือ/แท็บเล็ต
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                val takePictureIntent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                val photoFile = try {
                    File.createTempFile("scan_", ".jpg", cacheDir)
                } catch (_: Exception) { null }

                if (photoFile != null) {
                    cameraPhotoUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "$packageName.fileprovider",
                        photoFile
                    )
                    takePictureIntent.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, cameraPhotoUri)
                }

                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }

                val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                    putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                    putExtra(Intent.EXTRA_TITLE, "เลือกรูปภาพหรือเปิดกล้องสแกน")
                    putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(takePictureIntent))
                }

                try {
                    fileChooserLauncher.launch(chooserIntent)
                } catch (e: Exception) {
                    fileUploadCallback = null
                    return false
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            private var renderProcessGoneCount = 0
            private var lastRenderProcessGoneTime = 0L

            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                return request?.let { bundledWebContent.intercept(it) }
            }
            override fun onRenderProcessGone(
                view: WebView?,
                detail: RenderProcessGoneDetail?
            ): Boolean {
                val didCrash = detail?.didCrash() ?: false
                val now = System.currentTimeMillis()
                Log.e(TAG, "WebView render process gone! didCrash=$didCrash")

                if (now - lastRenderProcessGoneTime > 30000) {
                    renderProcessGoneCount = 0
                }
                renderProcessGoneCount++
                lastRenderProcessGoneTime = now

                // ป้องกันไม่ให้แอปปิดตัวเอง และป้องกัน Recreation Loop ไม่รู้จบ (ตัดสาเหตุ ANR ปิดหรือรอ 100%)
                runOnUiThread {
                    handleRenderProcessGone(view, didCrash, renderProcessGoneCount)
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                binding.layoutError.visibility = View.GONE
                // Wait for the page's first scroll report before allowing pull-to-refresh.
                canWebScrollUp = true
                binding.swipeRefreshLayout.isEnabled = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefreshLayout.isRefreshing = false
                injectScrollDetection(view)
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                binding.progressBar.visibility = View.GONE
                binding.swipeRefreshLayout.isRefreshing = false
                if (failingUrl == CLINIC_URL || failingUrl?.startsWith(CLINIC_URL) == true) {
                    binding.layoutError.visibility = View.VISIBLE
                    binding.tvErrorMessage.text = "ไม่สามารถเชื่อมต่อระบบอันผิงคลินิกได้\n($description)\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false

                // หากเป็นลิงก์สำหรับพิมพ์เอกสาร (เช่น ?print_ หรือ /records/... ที่มีรหัสเอกสาร) ให้เปิดในเบราว์เซอร์ภายนอกอัตโนมัติ
                if (url.contains("print_") || url.matches(Regex(".*/records/[^/]+-(?:\\d{6})?\\d{2,}.*"))) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e(TAG, "Cannot launch external browser: ${e.message}")
                    }
                }

                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false // โหลดภายในแอป WebView ตามปกติ
                }
                // ถ้าเป็นลิงก์ภายนอก เช่น tel: หรือ mailto: หรือ line:
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                    return true
                } catch (_: Exception) {
                    return false
                }
            }
        }

        // โหลดหน้าระบบอันผิงคลินิก
        webView.loadUrl(CLINIC_URL)
    }

    private fun handleRenderProcessGone(view: WebView?, didCrash: Boolean, crashCount: Int) {
        try {
            (view?.parent as? ViewGroup)?.removeView(view)
            view?.destroy()
        } catch (_: Exception) {}

        activeWebView = null
        binding.layoutError.visibility = View.VISIBLE

        if (crashCount <= 1) {
            binding.tvErrorMessage.text = "หน่วยความจำระบบได้รับการรีเซ็ต กำลังเปิดหน้าคลินิกใหม่อัตโนมัติ..."
            binding.root.postDelayed({
                try {
                    resetAndReloadWebView()
                } catch (e: Exception) {
                    Log.e(TAG, "resetAndReloadWebView error: ${e.message}")
                }
            }, 1200)
        } else {
            binding.tvErrorMessage.text = "หน่วยความจำระบบเต็มชั่วคราว กรุณากดปุ่มด้านล่างเพื่อเปิดหน้าคลินิกใหม่อีกครั้ง"
        }
    }

    private fun resetAndReloadWebView() {
        binding.layoutError.visibility = View.GONE
        binding.swipeRefreshLayout.removeAllViews()
        val newWebView = WebView(this).apply {
            id = R.id.webView
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        binding.swipeRefreshLayout.addView(newWebView)
        activeWebView = newWebView
        setupWebView(newWebView)
    }

    private fun injectScrollDetection(view: WebView?) {
        val js = """
            (function() {
                if (window.__scrollDetectionInjected) return;
                window.__scrollDetectionInjected = true;

                function checkCanScrollUp(target) {
                    try {
                        if (document.body && (
                            document.body.classList.contains('is-nav-expanded') || 
                            document.body.classList.contains('is-nav-dragging') ||
                            document.body.classList.contains('is-sidebar-animating') ||
                            document.body.classList.contains('is-dragging-sidebar')
                        )) {
                            return true;
                        }
                        var expandedSheet = document.querySelector('[data-bottom-sheet][data-expanded="true"]');
                        if (expandedSheet) return true;

                        if (target && target instanceof Element) {
                            if (target.closest('aside, header, nav, .no-pull-refresh, [role="dialog"], .fixed.inset-0, .is-dragging-sidebar, [data-bottom-sheet], [data-drag-handle], .nav-backdrop')) return true;

                            var el = target;
                            while (el && el !== document.body && el !== document.documentElement) {
                                if (el.scrollTop > 1) return true;
                                el = el.parentElement;
                            }
                        }
                        var main = document.getElementById('main-scroll-container');
                        if (main && main.scrollTop > 1) return true;
                        if (window.scrollY > 1 || document.documentElement.scrollTop > 1 || document.body.scrollTop > 1) return true;
                    } catch(e) {}
                    return false;
                }

                var lastState = null;
                function notifyState(canScroll) {
                    // React owns scroll synchronization once mounted; keep this as the loading fallback.
                    if (window.__anpingScrollSyncActive) return;
                    if (lastState === canScroll) return;
                    lastState = canScroll;
                    if (window.AndroidCardBridge && typeof window.AndroidCardBridge.setCanScrollUp === 'function') {
                        try {
                            window.AndroidCardBridge.setCanScrollUp(canScroll);
                        } catch(e) {}
                    }
                }

                document.addEventListener('touchstart', function(e) {
                    var target = (e.touches && e.touches[0]) ? e.touches[0].target : e.target;
                    notifyState(checkCanScrollUp(target));
                }, { capture: true, passive: true });

                // Touch start establishes the gesture owner; scroll events update it once per frame.
                var scrollFrame = 0;
                var scrollTarget = null;
                document.addEventListener('scroll', function(e) {
                    scrollTarget = e.target;
                    if (scrollFrame) return;
                    scrollFrame = requestAnimationFrame(function() {
                        scrollFrame = 0;
                        var target = scrollTarget;
                        notifyState(target && target.scrollTop > 1 ? true : checkCanScrollUp(target));
                    });
                }, { capture: true, passive: true });

                document.addEventListener('touchend', function() {
                    setTimeout(function() {
                        notifyState(checkCanScrollUp(null));
                    }, 50);
                }, { passive: true });

                notifyState(checkCanScrollUp(null));
            })();
        """.trimIndent()
        view?.evaluateJavascript(js, null)
    }

    private fun notifyWebCardInserted(card: CardModel) {
        val cleanCard = card.copy(citizenId = card.citizenId.replace(Regex("\\D"), ""))
        val jsonStr = cleanCard.toJson().toString()
        // ส่ง Event เข้าไปในหน้าเว็บผ่าน CustomEvent
        val jsCode = """
            (function() {
                try {
                    var event = new CustomEvent('smartcard-read', { detail: $jsonStr });
                    window.dispatchEvent(event);
                    if (window.onSmartCardAutoRead) {
                        window.onSmartCardAutoRead($jsonStr);
                    }
                } catch(e) {}
            })();
        """.trimIndent()
        getActiveWebView().evaluateJavascript(jsCode, null)
    }

    private fun notifyWebCardRemoved() {
        val jsCode = """
            (function() {
                try {
                    var event = new CustomEvent('smartcard-removed');
                    window.dispatchEvent(event);
                } catch(e) {}
            })();
        """.trimIndent()
        getActiveWebView().evaluateJavascript(jsCode, null)
    }

    private var pillDismissRunnable: Runnable? = null
    private var lastPillConnected: Boolean? = null
    private var lastPillHasCard: Boolean? = null

    private fun updateReaderStatusPill(connected: Boolean, readerName: String, hasCard: Boolean) {
        // ซ่อนป้ายลอยถาวร ไม่ให้ขึ้นมาค้างบังปุ่มและแถบนำทางด้านล่าง
        pillDismissRunnable?.let { binding.cardReaderPill.removeCallbacks(it) }
        binding.cardReaderPill.visibility = View.GONE

        // แสดงแจ้งเตือนแบบ Toast สั้นๆ อัตโนมัติแทนป๊อปอัพ เพื่อไม่ให้ค้างบังหน้าจอ
        val isFirstCheck = (lastPillConnected == null && lastPillHasCard == null)
        val prevConnected = lastPillConnected
        val prevHasCard = lastPillHasCard

        if (connected != prevConnected || hasCard != prevHasCard) {
            lastPillConnected = connected
            lastPillHasCard = hasCard

            if (!connected) {
                if (prevConnected == true) {
                    Toast.makeText(this@MainActivity, "ถอดเครื่องอ่านบัตรแล้ว", Toast.LENGTH_SHORT).show()
                }
            } else if (hasCard) {
                if (prevHasCard != true) {
                    Toast.makeText(this@MainActivity, "พบบัตรประชาชน (กำลังอ่านข้อมูล...)", Toast.LENGTH_SHORT).show()
                }
            } else {
                if (!isFirstCheck && prevConnected != true) {
                    Toast.makeText(this@MainActivity, "พบเครื่องอ่านบัตร: $readerName", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showCardDetailDialog(card: CardModel) {
        try {
            val dialogView = layoutInflater.inflate(R.layout.dialog_card_details, null)
            val dialog = BottomSheetDialog(this)
            dialog.setContentView(dialogView)

            val ivPhoto = dialogView.findViewById<ImageView>(R.id.ivDialogPhoto)
            val tvCid = dialogView.findViewById<TextView>(R.id.tvDialogCid)
            val tvNameTh = dialogView.findViewById<TextView>(R.id.tvDialogNameTh)
            val tvNameEn = dialogView.findViewById<TextView>(R.id.tvDialogNameEn)
            val tvDates = dialogView.findViewById<TextView>(R.id.tvDialogDates)
            val tvFullDetails = dialogView.findViewById<TextView>(R.id.tvDialogFullDetails)
            val btnClose = dialogView.findViewById<Button>(R.id.btnDialogClose)
            val btnCopy = dialogView.findViewById<Button>(R.id.btnDialogCopyCid)
            val btnApply = dialogView.findViewById<Button>(R.id.btnDialogApply)

            // 1. Photo
            val rawPhoto = if (card.photoBase64.startsWith("data:")) {
                card.photoBase64.substringAfter("base64,")
            } else card.photoBase64

            if (rawPhoto.isNotEmpty()) {
                try {
                    val photoBytes = Base64.decode(rawPhoto, Base64.DEFAULT)
                    val bitmap = BitmapFactory.decodeByteArray(photoBytes, 0, photoBytes.size)
                    if (bitmap != null) {
                        ivPhoto?.setImageBitmap(bitmap)
                    } else {
                        ivPhoto?.setImageResource(R.drawable.anping_logo)
                    }
                } catch (_: Exception) {
                    ivPhoto?.setImageResource(R.drawable.anping_logo)
                }
            } else {
                ivPhoto?.setImageResource(R.drawable.anping_logo)
            }

            // 2. Format CID
            val cleanCid = card.citizenId.replace(Regex("\\D"), "")
            val formattedCid = if (cleanCid.length == 13) {
                "${cleanCid[0]}-${cleanCid.substring(1, 5)}-${cleanCid.substring(5, 10)}-${cleanCid.substring(10, 12)}-${cleanCid[12]}"
            } else card.citizenId
            tvCid.text = formattedCid

            // 3. Names
            tvNameTh.text = "${card.prefixTh}${card.firstNameTh} ${card.lastNameTh}".trim()
            val enFull = "${card.prefixEn} ${card.firstNameEn} ${card.lastNameEn}".trim()
            tvNameEn.text = if (enFull.isNotEmpty()) enFull else "-"
            tvDates.text = "เกิด: ${card.dob} | เพศ: ${card.gender}"

            // 4. Details text
            val addressLine = buildString {
                if (card.address.isNotEmpty()) append("บ้านเลขที่ ${card.address} ")
                if (card.moo.isNotEmpty()) append("หมู่ ${card.moo} ")
                if (card.road.isNotEmpty()) append("ถนน/ซอย ${card.road} ")
                if (card.subDistrict.isNotEmpty()) append("ต.${card.subDistrict} ")
                if (card.district.isNotEmpty()) append("อ.${card.district} ")
                if (card.province.isNotEmpty()) append("จ.${card.province} ")
            }.trim()

            val fullText = """
                สัญชาติ: ${card.nationality.ifEmpty { "ไทย" }} | ศาสนา: ${card.religion.ifEmpty { "ไม่ระบุ" }}
                ที่อยู่ตามบัตร: ${addressLine.ifEmpty { card.address }}
                วันออกบัตร: ${card.issueDate.ifEmpty { "-" }}
                วันหมดอายุ: ${card.expireDate.ifEmpty { "-" }}
                ผู้ออกบัตร: ${card.issuer.ifEmpty { "-" }}
            """.trimIndent()
            tvFullDetails.text = fullText

            // 5. Actions
            btnClose?.setOnClickListener { dialog.dismiss() }
            btnCopy?.setOnClickListener {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val cleanCid = card.citizenId.replace(Regex("\\D"), "")
                val clip = ClipData.newPlainText("Citizen ID", cleanCid)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "คัดลอกเลขประจำตัวประชาชนแล้ว", Toast.LENGTH_SHORT).show()
            }
            btnApply?.setOnClickListener {
                val cleanCid = card.citizenId.replace(Regex("\\D"), "")
                notifyWebCardInserted(card.copy(citizenId = cleanCid))
                Toast.makeText(this, "ส่งข้อมูลเข้าสู่แบบฟอร์มแล้ว", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }

            dialog.show()
        } catch (e: Exception) {
            Log.e(TAG, "Error showing card detail dialog: ${e.message}")
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val web = getActiveWebView()
                // Same-document modal history is not always reflected by WebView.canGoBack().
                web.evaluateJavascript("""
                    (function() {
                        if (window.history.state && window.history.state.modal) {
                            window.history.back();
                            return true;
                        }
                        return false;
                    })()
                """.trimIndent()) { handled ->
                    if (handled == "true") return@evaluateJavascript
                    if (web.canGoBack()) {
                        web.goBack()
                    } else {
                        val currentTime = System.currentTimeMillis()
                        if (currentTime - lastBackPressTime < 2000) {
                            finish()
                        } else {
                            lastBackPressTime = currentTime
                            Toast.makeText(this@MainActivity, "กดปุ่มย้อนกลับอีกครั้งเพื่อออกจากระบบคลินิก", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleUsbDeviceIntent(intent)
    }

    private fun handleUsbDeviceIntent(intent: Intent?) {
        if (intent?.action == UsbManager.ACTION_USB_DEVICE_ATTACHED) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let {
                        if (cardService?.isSmartCardReader(it) == true) {
                            if (usbManager?.hasPermission(it) == true) {
                                cardService?.attachDevice(it)
                            } else {
                                withContext(Dispatchers.Main) {
                                    requestUsbPermission(it)
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "handleUsbDeviceIntent error: ${e.message}")
                }
            }
        }
    }

    private fun requestUsbPermission(device: UsbDevice) {
        val manager = usbManager ?: return
        if (cardService?.isSmartCardReader(device) == true) {
            if (!manager.hasPermission(device)) {
                val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val permissionIntent = PendingIntent.getBroadcast(
                    this,
                    0,
                    Intent(ACTION_USB_PERMISSION).setPackage(packageName),
                    flags
                )
                manager.requestPermission(device, permissionIntent)
            } else {
                cardService?.attachDevice(device)
            }
        }
    }

    private fun checkForAppUpdates() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL("$CLINIC_URL/clinic-version.json?t=${System.currentTimeMillis()}")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.requestMethod = "GET"

                if (conn.responseCode != 200) return@launch

                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(jsonStr)

                val latestCode = json.optInt("versionCode", 1)
                val latestName = json.optString("versionName", "1.5.0")
                val apkUrl = json.optString("apkUrl", "$CLINIC_URL/AnpingClinic.apk")
                val changelog = json.optString("changelog", "ปรับปรุงระบบความเสถียรและประสิทธิภาพ")

                val currentCode = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
                    } else {
                        @Suppress("DEPRECATION")
                        packageManager.getPackageInfo(packageName, 0).versionCode
                    }
                } catch (_: Exception) { 1 }

                if (latestCode > currentCode) {
                    withContext(Dispatchers.Main) {
                        if (!isFinishing && !isDestroyed) {
                            showUpdateDialog(latestName, changelog, apkUrl)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Update check failed: ${e.message}")
            }
        }
    }

    private fun showUpdateDialog(versionName: String, changelog: String, apkUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("อัปเดตเวอร์ชันใหม่ (v$versionName)")
            .setMessage("รายละเอียดการปรับปรุง:\n$changelog\n\nต้องการดาวน์โหลดและติดตั้งการอัปเดตทันทีหรือไม่?")
            .setCancelable(false)
            .setPositiveButton("อัปเดตทันที") { _, _ ->
                downloadAndInstallApk(apkUrl)
            }
            .setNegativeButton("ไว้ภายหลัง", null)
            .show()
    }

    private fun downloadAndInstallApk(apkUrl: String) {
        val progressDialog = android.app.ProgressDialog(this).apply {
            setTitle("กำลังดาวน์โหลดเวอร์ชันใหม่")
            setMessage("กรุณารอสักครู่...")
            setProgressStyle(android.app.ProgressDialog.STYLE_HORIZONTAL)
            isIndeterminate = false
            max = 100
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL(apkUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 8000
                conn.readTimeout = 8000
                conn.connect()

                val fileLength = conn.contentLength
                val apkFile = File(cacheDir, "update.apk")
                if (apkFile.exists()) apkFile.delete()

                val input = conn.inputStream
                val output = FileOutputStream(apkFile)
                val data = ByteArray(4096)
                var total: Long = 0
                var count: Int

                while (input.read(data).also { count = it } != -1) {
                    total += count.toLong()
                    if (fileLength > 0) {
                        val progress = ((total * 100) / fileLength).toInt()
                        withContext(Dispatchers.Main) {
                            progressDialog.progress = progress
                        }
                    }
                    output.write(data, 0, count)
                }

                output.flush()
                output.close()
                input.close()

                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    installApk(apkFile)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    Toast.makeText(this@MainActivity, "ดาวน์โหลดไม่สำเร็จ: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun installApk(apkFile: File) {
        try {
            val contentUri: Uri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(installIntent)
        } catch (e: Exception) {
            Toast.makeText(this, "ไม่สามารถเปิดตัวติดตั้งได้: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    override fun onResume() {
        super.onResume()
        isActivityVisible = true
        checkForAppUpdates()
    }

    override fun onPause() {
        super.onPause()
        isActivityVisible = false
    }

    override fun onDestroy() {
        super.onDestroy()
        isActivityVisible = false
        try { unregisterReceiver(usbReceiver) } catch (_: Exception) {}
        if (isBound) {
            try { unbindService(serviceConnection) } catch (_: Exception) {}
            isBound = false
        }
    }
}
