package com.anping.cardagent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*

class CardReaderService : Service() {

    companion object {
        private const val TAG = "CardReaderService"
        private const val CHANNEL_ID = "anping_card_service_channel"
        private const val NOTIFICATION_ID = 8181
        private const val ACTION_USB_PERMISSION = "com.anping.cardagent.USB_PERMISSION"
        var instance: CardReaderService? = null
    }

    private val binder = LocalBinder()
    private var httpServer: LocalHttpServer? = null
    private var usbManager: UsbManager? = null
    private var ccidDriver: UsbCcidDriver? = null
    private var currentDevice: UsbDevice? = null

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var monitorJob: Job? = null

    var onStatusChanged: ((Boolean, String, Boolean) -> Unit)? = null
    var onCardAutoRead: ((CardModel) -> Unit)? = null
    var onCardRemoved: (() -> Unit)? = null
    var latestCardData: CardModel? = null

    private val readLock = Any()
    @Volatile private var lastReadTime = 0L
    @Volatile private var lastBeepTime = 0L

    private val serviceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let { detachDevice(it) }
                }
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    device?.let { attachDevice(it) }
                }
                ACTION_USB_PERMISSION -> {
                    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    if (granted && device != null) {
                        initDriver(device)
                    }
                }
            }
        }
    }

    inner class LocalBinder : Binder() {
        fun getService(): CardReaderService = this@CardReaderService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        instance = this
        usbManager = getSystemService(Context.USB_SERVICE) as UsbManager

        createNotificationChannel()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    buildNotification("ระบบพร้อมทำงานในพื้นหลัง (พอร์ต 8181)"),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                )
            } else {
                startForeground(NOTIFICATION_ID, buildNotification("ระบบพร้อมทำงานในพื้นหลัง (พอร์ต 8181)"))
            }
        } catch (e: Throwable) {
            Log.e(TAG, "startForeground error: ${e.message}")
            try {
                startForeground(NOTIFICATION_ID, buildNotification("ระบบพร้อมทำงานในพื้นหลัง (พอร์ต 8181)"))
            } catch (e2: Throwable) {
                Log.e(TAG, "Fallback startForeground error: ${e2.message}")
            }
        }

        // ลงทะเบียนตรวจจับการเสียบ-ถอดสาย USB ในระดับ Service เบื้องหลัง
        try {
            val filter = IntentFilter().apply {
                addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
                addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
                addAction(ACTION_USB_PERMISSION)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.registerReceiver(this, serviceReceiver, filter, ContextCompat.RECEIVER_EXPORTED)
            } else {
                registerReceiver(serviceReceiver, filter)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering serviceReceiver: ${e.message}")
        }

        // เริ่มต้น Local HTTP Server (Loopback 127.0.0.1:8181)
        httpServer = LocalHttpServer(
            port = 8181,
            onReadCardRequested = { includePhoto -> readCard(includePhoto) },
            onStatusRequested = {
                if (ccidDriver == null) {
                    checkConnectedDevices()
                }
                val isConnected = ccidDriver != null
                val name = currentDevice?.productName ?: (if (isConnected) "USB Smart Card Reader" else "ไม่มีอุปกรณ์")
                val hasCard = if (isConnected) {
                    try { ccidDriver?.isCardPresent() ?: false } catch (_: Exception) { false }
                } else false
                StatusInfo(
                    deviceConnected = isConnected,
                    readerName = name,
                    hasCard = hasCard
                )
            }
        )
        httpServer?.start()

        checkConnectedDevices()
        startStatusMonitor()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                it.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                it.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            }
            if (device != null) {
                attachDevice(device)
            } else {
                checkConnectedDevices()
            }
        }
        return START_STICKY
    }

    private fun startStatusMonitor() {
        monitorJob?.cancel()
        monitorJob = serviceScope.launch {
            var lastConnected = false
            var lastHasCard = false
            var lastReaderName = ""

            while (isActive) {
                try {
                    val manager = usbManager
                    if (manager != null) {
                        // ถ้าเครื่องอ่านเดิมถูกถอดสายออก ให้รีเซ็ตไดรเวอร์ทันที ป้องกันแอปค้างหรือสถานะบัตรตกค้าง
                        if (currentDevice != null) {
                            val isStillConnected = manager.deviceList.values.any { it.deviceId == currentDevice?.deviceId }
                            if (!isStillConnected) {
                                currentDevice?.let { detachDevice(it) }
                            }
                        }
                        if (ccidDriver == null) {
                            checkConnectedDevices()
                        }
                    }

                    val isConnected = ccidDriver != null
                    val readerName = if (isConnected) {
                        currentDevice?.productName ?: "USB Smart Card Reader"
                    } else {
                        "ไม่มีอุปกรณ์"
                    }

                    val hasCard = if (isConnected) {
                        try {
                            ccidDriver?.isCardPresent() ?: false
                        } catch (_: Exception) {
                            false
                        }
                    } else false

                    val justInserted = hasCard && !lastHasCard
                    val justRemoved = !hasCard && lastHasCard

                    if (justRemoved) {
                        latestCardData = null
                        lastReadTime = 0L
                        withContext(Dispatchers.Main) {
                            onCardRemoved?.invoke()
                        }
                    }
                    if (!hasCard) {
                        latestCardData = null
                        lastReadTime = 0L
                    }

                    if (isConnected != lastConnected || hasCard != lastHasCard || readerName != lastReaderName) {
                        lastConnected = isConnected
                        lastHasCard = hasCard
                        lastReaderName = readerName

                        val notifText = if (isConnected) {
                            val cardStatusText = if (hasCard) "พบบัตรประชาชน" else "ยังไม่เสียบบัตร"
                            "เชื่อมต่อแล้ว: $readerName ($cardStatusText)"
                        } else {
                            "ระบบพร้อมทำงานในพื้นหลัง (รอการเชื่อมต่อเครื่องอ่าน)"
                        }
                        updateNotification(notifText)
                        onStatusChanged?.invoke(isConnected, readerName, hasCard)

                        // เสียบบัตรปุ๊บ ดึงข้อมูลและรูปภาพอัตโนมัติทันที
                        if (justInserted) {
                            serviceScope.launch(Dispatchers.IO) {
                                try {
                                    delay(350)
                                    val card = readCard(includePhoto = true)
                                    if (card != null) {
                                        latestCardData = card
                                        withContext(Dispatchers.Main) {
                                            onCardAutoRead?.invoke(card)
                                        }
                                    }
                                } catch (e: Exception) {
                                    Log.e(TAG, "Auto read on insert error: ${e.message}")
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Monitor loop error: ${e.message}")
                }
                delay(1000)
            }
        }
    }

    fun checkConnectedDevices() {
        val manager = usbManager ?: return
        val deviceList = manager.deviceList
        for ((_, device) in deviceList) {
            if (isSmartCardReader(device)) {
                attachDevice(device)
                break
            }
        }
    }

    fun isSmartCardReader(device: UsbDevice): Boolean {
        // 1. Class 11 = CCID Smart Card Reader
        for (i in 0 until device.interfaceCount) {
            if (device.getInterface(i).interfaceClass == 11) return true
        }
        if (device.deviceClass == 11) return true

        // 2. ตรวจสอบจากชื่ออุปกรณ์ (เช่น "EMV Smartcard Reader", "Smart Card", ฯลฯ)
        val prod = (device.productName ?: "").lowercase()
        if (prod.contains("smart") || prod.contains("card") || prod.contains("reader") || prod.contains("ccid") || prod.contains("emv")) {
            return true
        }

        // 3. ตรวจสอบจากรหัสผู้ผลิตที่พบบ่อย
        val knownVendors = listOf(1423, 3034, 1839, 2652, 2278, 2414, 1254, 1060, 11491, 6720)
        if (knownVendors.contains(device.vendorId)) return true

        return false
    }

    fun attachDevice(device: UsbDevice) {
        val manager = usbManager ?: return
        if (!isSmartCardReader(device)) return
        this.currentDevice = device

        if (manager.hasPermission(device)) {
            initDriver(device)
        } else {
            Log.d(TAG, "Waiting for USB permission for: ${device.productName ?: device.deviceName}")
        }
    }

    fun getCurrentDevice(): UsbDevice? = currentDevice
    fun getLatestCard(): CardModel? = latestCardData

    fun isCardPresent(): Boolean {
        return try {
            ccidDriver?.isCardPresent() ?: false
        } catch (_: Exception) {
            false
        }
    }

    fun initDriver(device: UsbDevice) {
        val manager = usbManager ?: return
        ccidDriver?.close()

        val driver = UsbCcidDriver(manager, device)
        if (driver.open()) {
            this.ccidDriver = driver
            val readerName = device.productName ?: "USB Smart Card Reader"
            val hasCard = driver.isCardPresent()
            updateNotification("เชื่อมต่อเครื่องอ่านแล้ว: $readerName")
            onStatusChanged?.invoke(true, readerName, hasCard)
            Log.i(TAG, "CCID Driver initialized for $readerName")
        } else {
            this.ccidDriver = null
            onStatusChanged?.invoke(false, "ไม่สามารถเปิดไดรเวอร์ได้", false)
        }
    }

    fun detachDevice(device: UsbDevice) {
        try {
            if (currentDevice == null || currentDevice?.deviceId == device.deviceId) {
                ccidDriver?.close()
                ccidDriver = null
                currentDevice = null
                latestCardData = null
                lastReadTime = 0L
                updateNotification("เครื่องอ่านถูกดึงออกแล้ว (รอการเชื่อมต่อใหม่)")
                onStatusChanged?.invoke(false, "ไม่มีอุปกรณ์", false)
                onCardRemoved?.invoke()
            }
        } catch (e: Exception) {
            Log.e(TAG, "detachDevice error: ${e.message}")
        }
    }

    fun readCard(includePhoto: Boolean = false): CardModel? {
        synchronized(readLock) {
            val now = System.currentTimeMillis()
            val cached = latestCardData
            // ถ้าเพิ่งอ่านสำเร็จภายใน 4.5 วินาทีที่ผ่านมา และมีข้อมูลครบตามที่ขอ ให้คืนแคชทันที ป้องกันอ่านชิปซ้ำซ้อนและเสียงดังรัว
            if (cached != null && (now - lastReadTime < 4500)) {
                if (!includePhoto || cached.photoBase64.isNotEmpty()) {
                    Log.i(TAG, "Returning cached card data for ${cached.citizenId}")
                    return cached
                }
            }

            val driver = ccidDriver ?: run {
                checkConnectedDevices()
                ccidDriver
            } ?: return null

            val card = try {
                driver.readThaiCard(includePhoto)
            } catch (e: Exception) {
                Log.e(TAG, "readThaiCard error: ${e.message}")
                null
            }
            if (card != null) {
                latestCardData = card
                lastReadTime = System.currentTimeMillis()
                playBeep()
            } else {
                latestCardData = null
                lastReadTime = 0L
            }
            return card
        }
    }

    fun playBeep() {
        val now = System.currentTimeMillis()
        // Debounce: ป้องกันเสียงเตือนดังซ้ำ 3-5 ครั้ง โดยจำกัดให้ดังได้สูงสุดเพียง 1 ครั้งต่อ 3.5 วินาที
        if (now - lastBeepTime < 3500) {
            Log.i(TAG, "playBeep debounced (cooldown 3.5s)")
            return
        }
        lastBeepTime = now

        try {
            val mp = MediaPlayer.create(this, R.raw.card_chime)
            if (mp != null) {
                mp.setOnCompletionListener { it.release() }
                mp.start()
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "MediaPlayer card_chime error: ${e.message}")
        }
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_MUSIC, 70)
            toneGen.startTone(ToneGenerator.TONE_PROP_ACK, 180)
        } catch (_: Exception) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Anping Smart Card Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "บริการเชื่อมต่อเครื่องอ่านบัตรประชาชนสำหรับเว็บคลินิก"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val largeIcon = try {
            BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        } catch (_: Exception) {
            null
        }

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("อันผิงคลินิก (Anping Card Agent)")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_agenda)
            .setContentIntent(pendingIntent)
            .setOngoing(true)

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon)
        }

        return builder.build()
    }

    private fun updateNotification(text: String) {
        try {
            val notification = buildNotification(text)
            val manager = getSystemService(NotificationManager::class.java)
            manager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Throwable) {
            Log.w(TAG, "updateNotification error: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(serviceReceiver)
        } catch (_: Exception) {}
        monitorJob?.cancel()
        serviceScope.cancel()
        httpServer?.stop()
        ccidDriver?.close()
        instance = null
    }
}
