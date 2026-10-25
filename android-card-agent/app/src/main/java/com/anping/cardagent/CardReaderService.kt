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

    @Volatile var isDeviceConnectedCached: Boolean = false
        private set
    @Volatile var isCardPresentCached: Boolean = false
        private set
    @Volatile var cachedReaderName: String = "ไม่มีอุปกรณ์"
        private set

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
                    if (granted && device != null && isSmartCardReader(device)) {
                        attachDevice(device)
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
                StatusInfo(
                    deviceConnected = isDeviceConnectedCached,
                    readerName = cachedReaderName,
                    hasCard = isCardPresentCached
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
            var idleLoopCount = 0

            while (isActive) {
                try {
                    val manager = usbManager
                    val driver = ccidDriver
                    val dev = currentDevice

                    if (driver != null && dev != null && manager != null) {
                        // เมื่อมีเครื่องอ่านเชื่อมต่ออยู่
                        idleLoopCount = 0

                        // ถ้าเครื่องอ่านเดิมถูกถอดสายออก ให้รีเซ็ตไดรเวอร์ทันที
                        val isStillConnected = manager.deviceList.values.any { it.deviceId == dev.deviceId }
                        if (!isStillConnected) {
                            detachDevice(dev)
                            delay(1000)
                            continue
                        }

                        val hasCard = try {
                            driver.isCardPresent()
                        } catch (e: Exception) {
                            Log.w(TAG, "isCardPresent exception: ${e.message}")
                            false
                        }

                        val readerName = dev.productName ?: "USB Smart Card Reader"
                        isDeviceConnectedCached = true
                        cachedReaderName = readerName
                        isCardPresentCached = hasCard

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

                        if (!lastConnected || hasCard != lastHasCard || readerName != lastReaderName) {
                            lastConnected = true
                            lastHasCard = hasCard
                            lastReaderName = readerName

                            val cardStatusText = if (hasCard) "พบบัตรประชาชน" else "ยังไม่เสียบบัตร"
                            updateNotification("เชื่อมต่อแล้ว: $readerName ($cardStatusText)")
                            withContext(Dispatchers.Main) {
                                onStatusChanged?.invoke(true, readerName, hasCard)
                            }

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
                        delay(1000)
                    } else {
                        // ไม่มีอุปกรณ์เชื่อมต่อ (Idle State): ประหยัดพลังงานและตัดปัญหา ANR
                        isDeviceConnectedCached = false
                        cachedReaderName = "ไม่มีอุปกรณ์"
                        isCardPresentCached = false

                        if (lastConnected) {
                            lastConnected = false
                            lastHasCard = false
                            lastReaderName = "ไม่มีอุปกรณ์"
                            updateNotification("ระบบพร้อมทำงานในพื้นหลัง (รอการเชื่อมต่อเครื่องอ่าน)")
                            withContext(Dispatchers.Main) {
                                onStatusChanged?.invoke(false, "ไม่มีอุปกรณ์", false)
                            }
                        }

                        // เช็คแบบ fallback ทุก 15 วินาทีเท่านั้น เพื่อป้องกันการรบกวนระบบ USB ของแท็บเล็ต
                        idleLoopCount++
                        if (idleLoopCount >= 10) {
                            idleLoopCount = 0
                            checkConnectedDevices()
                        }

                        delay(1500)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Monitor loop error: ${e.message}")
                    delay(2000)
                }
            }
        }
    }

    fun checkConnectedDevices() {
        val manager = usbManager ?: return
        if (ccidDriver != null) return // มีไดรเวอร์ทำงานอยู่แล้ว ไม่ต้องสแกนซ้ำ
        try {
            val deviceList = manager.deviceList
            for ((_, device) in deviceList) {
                if (isSmartCardReader(device)) {
                    attachDevice(device)
                    break
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "checkConnectedDevices error: ${e.message}")
        }
    }

    fun isSmartCardReader(device: UsbDevice): Boolean {
        // ตัด USB Hub ออกทันที (Class 9)
        if (device.deviceClass == android.hardware.usb.UsbConstants.USB_CLASS_HUB) return false

        // 1. Class 11 = CCID Smart Card Reader (มาตรฐานสากล)
        for (i in 0 until device.interfaceCount) {
            if (device.getInterface(i).interfaceClass == 11) return true
        }
        if (device.deviceClass == 11) return true

        // 2. ตรวจสอบจากชื่ออุปกรณ์ ต้องมีคีย์เวิร์ดเครื่องอ่านบัตร และไม่ใช่อุปกรณ์ประเภท Storage หรือ Hub
        val prod = (device.productName ?: "").lowercase()
        val isSmartCardName = prod.contains("smart card") ||
                prod.contains("smartcard") ||
                prod.contains("ccid") ||
                prod.contains("acr39") ||
                prod.contains("acr38") ||
                prod.contains("scr3310") ||
                prod.contains("feitian")

        if (isSmartCardName) {
            val isStorageOrHub = (0 until device.interfaceCount).any {
                val cls = device.getInterface(it).interfaceClass
                cls == android.hardware.usb.UsbConstants.USB_CLASS_MASS_STORAGE ||
                cls == android.hardware.usb.UsbConstants.USB_CLASS_HUB
            }
            if (!isStorageOrHub) return true
        }

        return false
    }

    fun attachDevice(device: UsbDevice) {
        val manager = usbManager ?: return
        if (!isSmartCardReader(device)) return

        if (manager.hasPermission(device)) {
            serviceScope.launch(Dispatchers.IO) {
                initDriver(device)
            }
        } else {
            Log.d(TAG, "Waiting for USB permission for: ${device.productName ?: device.deviceName}")
        }
    }

    fun getCurrentDevice(): UsbDevice? = currentDevice
    fun getLatestCard(): CardModel? = latestCardData

    fun isCardPresent(): Boolean = isCardPresentCached

    fun initDriver(device: UsbDevice) {
        val manager = usbManager ?: return
        if (!isSmartCardReader(device)) return

        synchronized(readLock) {
            try {
                ccidDriver?.close()
            } catch (_: Exception) {}

            val driver = UsbCcidDriver(manager, device)
            if (driver.open()) {
                this.ccidDriver = driver
                this.currentDevice = device
                val readerName = device.productName ?: "USB Smart Card Reader"
                val hasCard = try { driver.isCardPresent() } catch (_: Exception) { false }

                isDeviceConnectedCached = true
                cachedReaderName = readerName
                isCardPresentCached = hasCard

                updateNotification("เชื่อมต่อเครื่องอ่านแล้ว: $readerName")
                serviceScope.launch(Dispatchers.Main) {
                    onStatusChanged?.invoke(true, readerName, hasCard)
                }
                Log.i(TAG, "CCID Driver initialized successfully for $readerName")
            } else {
                this.ccidDriver = null
                this.currentDevice = null
                isDeviceConnectedCached = false
                cachedReaderName = "ไม่มีอุปกรณ์"
                isCardPresentCached = false

                serviceScope.launch(Dispatchers.Main) {
                    onStatusChanged?.invoke(false, "ไม่มีอุปกรณ์", false)
                }
            }
        }
    }

    fun detachDevice(device: UsbDevice) {
        try {
            if (currentDevice == null || currentDevice?.deviceId == device.deviceId) {
                synchronized(readLock) {
                    try { ccidDriver?.close() } catch (_: Exception) {}
                    ccidDriver = null
                    currentDevice = null
                    isDeviceConnectedCached = false
                    cachedReaderName = "ไม่มีอุปกรณ์"
                    isCardPresentCached = false
                    latestCardData = null
                    lastReadTime = 0L
                }
                updateNotification("ระบบพร้อมทำงานในพื้นหลัง (รอการเชื่อมต่อเครื่องอ่าน)")
                serviceScope.launch(Dispatchers.Main) {
                    onStatusChanged?.invoke(false, "ไม่มีอุปกรณ์", false)
                    onCardRemoved?.invoke()
                }
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
