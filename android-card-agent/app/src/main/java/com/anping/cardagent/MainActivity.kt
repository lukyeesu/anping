package com.anping.cardagent

import android.app.PendingIntent
import android.content.*
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.PopupMenu
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.anping.cardagent.databinding.ActivityMainBinding
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
        private const val ACTION_USB_PERMISSION = "com.anping.cardagent.USB_PERMISSION"
        var isActivityVisible: Boolean = false
            private set
    }

    private lateinit var binding: ActivityMainBinding
    private var usbManager: UsbManager? = null
    private var cardService: CardReaderService? = null
    private var isBound = false

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as CardReaderService.LocalBinder
            cardService = binder.getService()
            isBound = true

            cardService?.onStatusChanged = { connected, readerName, hasCard ->
                runOnUiThread { updateUiStatus(connected, readerName, hasCard) }
            }

            // รับข้อมูลการอ่านบัตรอัตโนมัติเมื่อมีการเสียบบัตร
            cardService?.onCardAutoRead = { card ->
                runOnUiThread { renderCardData(card, isAuto = true) }
            }

            // เมื่อถอดบัตรออก ให้รีเซ็ตข้อมูลพรีวิวบนหน้าจอทันที
            cardService?.onCardRemoved = {
                runOnUiThread { resetPreviewUi() }
            }

            // คืนค่าข้อมูลล่าสุดที่เคยอ่านไว้ (ป้องกันข้อมูลหายเมื่อหมุนจอหรือเปิดแอปใหม่ เฉพาะกรณีที่ยังมีบัตรเสียบอยู่)
            val hasCard = cardService?.isCardPresent() ?: false
            if (hasCard) {
                cardService?.latestCardData?.let { lastCard ->
                    runOnUiThread { renderCardData(lastCard, isAuto = false) }
                }
            } else {
                runOnUiThread { resetPreviewUi() }
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
                            device?.let { cardService?.initDriver(it) }
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
                        if (usbManager?.hasPermission(it) == true) {
                            cardService?.initDriver(it)
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

        // ล้างไฟล์อัปเดตตกค้าง (update.apk) ในแคชทันทีที่เปิดแอป ไม่ให้เป็นไฟล์ขยะรกเครื่อง
        try {
            val oldApk = File(cacheDir, "update.apk")
            if (oldApk.exists()) {
                oldApk.delete()
                Log.i("MainActivity", "Cleaned up old update.apk on launch")
            }
        } catch (_: Exception) {}

        usbManager = getSystemService(Context.USB_SERVICE) as UsbManager

        // เริ่มต้น Background Service ทันที
        try {
            val serviceIntent = Intent(this, CardReaderService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.e("MainActivity", "Error starting CardReaderService: ${e.message}")
        }

        // ถ้าเปิดขึ้นมาจากการเสียบสาย USB ให้ทำงานในพื้นหลังทันที ไม่แย่งหน้าจอ
        if (intent?.action == UsbManager.ACTION_USB_DEVICE_ATTACHED) {
            val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            }
            if (device != null && usbManager?.hasPermission(device) == true) {
                cardService?.initDriver(device)
            }
            moveTaskToBack(true)
            finish()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

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
            Log.e("MainActivity", "Error registering usbReceiver: ${e.message}")
        }

        setupListeners()
        setupMenu()
    }

    override fun onResume() {
        super.onResume()
        isActivityVisible = true
        // คืนค่าข้อมูลที่เคยอ่านไว้ ป้องกันข้อมูลหายเมื่อหมุนหน้าจอ (เฉพาะกรณีที่ยังมีบัตรเสียบอยู่)
        val hasCard = cardService?.isCardPresent() ?: false
        if (hasCard) {
            cardService?.latestCardData?.let { lastCard ->
                if (binding.tvPreviewCid.text.isNullOrEmpty()) {
                    renderCardData(lastCard, isAuto = false)
                }
            }
        } else {
            resetPreviewUi()
        }
    }

    override fun onPause() {
        super.onPause()
        isActivityVisible = false
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent?.action == UsbManager.ACTION_USB_DEVICE_ATTACHED) {
            val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
            }
            if (device != null && usbManager?.hasPermission(device) == true) {
                cardService?.initDriver(device)
            }
            moveTaskToBack(true)
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
                cardService?.initDriver(device)
            }
        }
    }

    private fun setupMenu() {
        binding.btnMenu.setOnClickListener { view ->
            val popup = PopupMenu(this, view)
            popup.menu.add(0, 1, 0, "ตรวจสอบการอัปเดตเวอร์ชันใหม่")
            popup.menu.add(0, 2, 1, "เกี่ยวกับแอป")

            popup.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    1 -> {
                        checkAndDownloadUpdate()
                        true
                    }
                    2 -> {
                        showAboutDialog()
                        true
                    }
                    else -> false
                }
            }
            popup.show()
        }
    }

    private fun showAboutDialog() {
        val currentVersion = try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (_: Exception) { "1.3.0" }

        AlertDialog.Builder(this)
            .setTitle("อันผิงคลินิก (Anping Card Agent)")
            .setMessage("""
                เวอร์ชัน: v$currentVersion
                หน้าที่: ตัวกลางเชื่อมต่อเครื่องอ่านบัตรประชาชน USB Smart Card Reader
                เซิร์ฟเวอร์: 127.0.0.1:8181 (Loopback)
                
                พัฒนาสำหรับ: อันผิงคลินิกการแพทย์แผนจีน
            """.trimIndent())
            .setPositiveButton("ตกลง", null)
            .show()
    }

    private fun setupListeners() {
        binding.btnTestRead.setOnClickListener {
            val dev = cardService?.getCurrentDevice()
            if (dev != null && usbManager?.hasPermission(dev) == false) {
                requestUsbPermission(dev)
                Toast.makeText(this, "กรุณากดอนุญาตให้เข้าถึงเครื่องอ่านบัตร", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            binding.btnTestRead.isEnabled = false
            binding.tvPreviewData.text = "กำลังอ่านข้อมูลชิปบัตรและรูปถ่าย..."

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val cardData = cardService?.readCard(includePhoto = true)
                    withContext(Dispatchers.Main) {
                        if (cardData != null) {
                            renderCardData(cardData, isAuto = false)
                        } else {
                            resetPreviewUi()
                            binding.tvPreviewData.text = "ไม่พบบัตรประชาชนในช่องอ่าน\n\nคำแนะนำ:\n1. ตรวจสอบว่าเสียบสาย OTG แน่นหรือไม่\n2. เสียบบัตรประชาชนให้ลึกจนสุดช่องอ่าน\n3. ตรวจสอบว่าหงายชิปทองเหลืองเข้าด้านที่ถูกต้อง\n4. เสียบบัตรแล้วกดปุ่มอ่านอีกครั้ง"
                            Toast.makeText(this@MainActivity, "ไม่พบบัตรประชาชน กรุณาเสียบบัตรแล้วลองใหม่", Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "เกิดข้อผิดพลาด: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                } finally {
                    withContext(Dispatchers.Main) {
                        binding.btnTestRead.isEnabled = true
                    }
                }
            }
        }
    }

    private fun renderCardData(cardData: CardModel, isAuto: Boolean = false) {
        binding.layoutPhotoContainer.visibility = View.VISIBLE

        // 1. แสดงรูปถ่ายใบหน้า
        if (cardData.photoBase64.isNotEmpty()) {
            try {
                val photoBytes = Base64.decode(cardData.photoBase64, Base64.DEFAULT)
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(photoBytes, 0, photoBytes.size)
                if (bitmap != null) {
                    binding.ivCardPhoto.setImageBitmap(bitmap)
                    binding.ivCardPhoto.visibility = View.VISIBLE
                } else {
                    binding.ivCardPhoto.visibility = View.GONE
                }
            } catch (e: Exception) {
                binding.ivCardPhoto.visibility = View.GONE
            }
        } else {
            binding.ivCardPhoto.visibility = View.GONE
        }

        // 2. แสดงข้อมูลสรุป
        val formattedCid = formatCid(cardData.citizenId)
        binding.tvPreviewCid.text = formattedCid
        binding.tvPreviewNameTh.text = "${cardData.prefixTh}${cardData.firstNameTh} ${cardData.lastNameTh}"
        val enFullName = "${cardData.prefixEn} ${cardData.firstNameEn} ${cardData.lastNameEn}".trim()
        binding.tvPreviewNameEn.text = if (enFullName.isNotEmpty()) enFullName else "-"
        binding.tvPreviewDates.text = "เกิด: ${cardData.dob} | หมดอายุ: ${cardData.expireDate}"

        // 3. แสดงข้อมูลรายละเอียดครบถ้วน
        val displayText = """
            ข้อมูลบัตรประชาชนฉบับเต็ม
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            เลขบัตร: $formattedCid
            ชื่อ-สกุล (ไทย): ${cardData.prefixTh}${cardData.firstNameTh} ${cardData.lastNameTh}
            ชื่อ-สกุล (อังกฤษ): ${if (enFullName.isNotEmpty()) enFullName else "-"}
            วันเกิด: ${cardData.dob} (เพศ: ${cardData.gender})
            สัญชาติ: ${cardData.nationality} | ศาสนา: ${if (cardData.religion.isNotEmpty()) cardData.religion else "- (ไม่ระบุในชิป)"}
            ที่อยู่ตามบัตร: ${cardData.address} หมู่ ${cardData.moo}
            ถนน/ซอย: ${cardData.road.ifEmpty { "-" }}
            ตำบล/แขวง: ${cardData.subDistrict}
            อำเภอ/เขต: ${cardData.district}
            จังหวัด: ${cardData.province}
            วันออกบัตร: ${cardData.issueDate.ifEmpty { "-" }}
            วันหมดอายุ: ${cardData.expireDate.ifEmpty { "-" }}
            ผู้ออกบัตร: ${cardData.issuer.ifEmpty { "-" }}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            รูปถ่ายใบหน้า: ${if (cardData.photoBase64.isNotEmpty()) "ดึงภาพถ่ายจากชิปสำเร็จ (${(cardData.photoBase64.length * 3 / 4) / 1024} KB)" else "ไม่มีข้อมูลรูป"}
            สถานะ: พร้อมส่งข้อมูลให้หน้าเว็บคลินิก
        """.trimIndent()
        binding.tvPreviewData.text = displayText

        val msg = if (isAuto) "ดึงข้อมูลจากบัตรประชาชนอัตโนมัติสำเร็จ" else "อ่านข้อมูลและรูปถ่ายสำเร็จ"
        Toast.makeText(this@MainActivity, msg, Toast.LENGTH_SHORT).show()
    }

    private fun formatCid(cid: String): String {
        if (cid.length == 13) {
            return "${cid[0]}-${cid.substring(1, 5)}-${cid.substring(5, 10)}-${cid.substring(10, 12)}-${cid[12]}"
        }
        return cid
    }

    private fun checkAndDownloadUpdate() {
        Toast.makeText(this, "กำลังตรวจสอบเวอร์ชันล่าสุด...", Toast.LENGTH_SHORT).show()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val versionUrl = URL("https://anpingclinic.vercel.app/version.json")
                val conn = versionUrl.openConnection() as HttpURLConnection
                conn.connectTimeout = 6000
                conn.readTimeout = 6000
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(jsonStr)

                val latestCode = json.optInt("versionCode", 1)
                val latestName = json.optString("versionName", "1.3.0")
                val apkUrl = json.optString("apkUrl", "https://anpingclinic.vercel.app/anping-card-agent.apk")
                val changelog = json.optString("changelog", "ปรับปรุงระบบอ่านบัตรและความเสถียร")

                val currentCode = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
                    } else {
                        @Suppress("DEPRECATION")
                        packageManager.getPackageInfo(packageName, 0).versionCode
                    }
                } catch (_: Exception) { 1 }

                withContext(Dispatchers.Main) {
                    if (latestCode > currentCode) {
                        showUpdateConfirmDialog(latestName, changelog, apkUrl)
                    } else {
                        Toast.makeText(this@MainActivity, "แอปเป็นเวอร์ชันล่าสุดแล้ว (v$latestName)", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                Log.w("MainActivity", "Check update error: ${e.message}")
                withContext(Dispatchers.Main) {
                    showDirectDownloadDialog("https://anpingclinic.vercel.app/anping-card-agent.apk")
                }
            }
        }
    }

    private fun showUpdateConfirmDialog(versionName: String, changelog: String, apkUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("พบการอัปเดตเวอร์ชันใหม่ (v$versionName)")
            .setMessage("รายละเอียดการปรับปรุง:\n$changelog\n\nต้องการดาวน์โหลดและติดตั้งการอัปเดตทันทีหรือไม่?")
            .setPositiveButton("อัปเดตทันที") { _, _ ->
                downloadAndInstallApk(apkUrl)
            }
            .setNegativeButton("ไว้ภายหลัง", null)
            .setCancelable(false)
            .show()
    }

    private fun showDirectDownloadDialog(apkUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("ดาวน์โหลดเวอร์ชันล่าสุด")
            .setMessage("ต้องการดาวน์โหลดและติดตั้งไฟล์อัปเดตเวอร์ชันล่าสุดจากเซิร์ฟเวอร์คลินิกหรือไม่?")
            .setPositiveButton("ดาวน์โหลดและอัปเดต") { _, _ ->
                downloadAndInstallApk(apkUrl)
            }
            .setNegativeButton("ยกเลิก", null)
            .show()
    }

    private fun downloadAndInstallApk(apkUrlString: String) {
        @Suppress("DEPRECATION")
        val progressDialog = android.app.ProgressDialog(this).apply {
            setTitle("กำลังดาวน์โหลดอัปเดต")
            setMessage("กรุณารอสักครู่ ระบบกำลังดาวน์โหลดไฟล์ติดตั้งเวอร์ชันใหม่...")
            setProgressStyle(android.app.ProgressDialog.STYLE_HORIZONTAL)
            isIndeterminate = false
            max = 100
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL(apkUrlString)
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 10000
                conn.readTimeout = 25000
                val fileLength = conn.contentLength
                val contentType = conn.contentType ?: ""

                if (contentType.contains("text/html") || (fileLength in 1..100000)) {
                    throw IllegalStateException("ไฟล์ APK บนเซิร์ฟเวอร์ยังไม่พร้อมใช้งาน (ยังไม่ได้นำไฟล์ขึ้น Vercel)")
                }

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
                Log.e("MainActivity", "Download APK error: ${e.message}")
                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    Toast.makeText(this@MainActivity, "ดาวน์โหลดล้มเหลว: ${e.message}", Toast.LENGTH_LONG).show()
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
            Log.e("MainActivity", "Install APK error: ${e.message}")
            Toast.makeText(this, "ไม่สามารถเปิดตัวติดตั้งได้: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun resetPreviewUi() {
        binding.layoutPhotoContainer.visibility = View.GONE
        binding.ivCardPhoto.setImageBitmap(null)
        binding.ivCardPhoto.visibility = View.GONE
        binding.tvPreviewCid.text = ""
        binding.tvPreviewNameTh.text = ""
        binding.tvPreviewNameEn.text = ""
        binding.tvPreviewDates.text = ""
        binding.tvPreviewData.text = "พร้อมใช้งาน\n\nเมื่อเสียบบัตรประชาชน ข้อมูลและรูปถ่ายจะถูกดึงเข้าสู่ระบบอัตโนมัติ"
    }

    private fun updateUiStatus(connected: Boolean, readerName: String, hasCard: Boolean) {
        // ช่องที่ 1: เซิร์ฟเวอร์ในเครื่อง
        binding.dotServerStatus.setBackgroundResource(R.drawable.shape_circle_green)
        binding.tvServerDetail.text = "พร้อมทำงาน\nพอร์ต 8181"

        // ช่องที่ 2: เครื่องอ่านบัตร
        if (connected) {
            binding.dotReaderStatus.setBackgroundResource(R.drawable.shape_circle_green)
            binding.tvReaderDetail.text = "เชื่อมต่อแล้ว\n$readerName"
        } else {
            binding.dotReaderStatus.setBackgroundResource(R.drawable.shape_circle_red)
            binding.tvReaderDetail.text = "ยังไม่เชื่อมต่อ\nรอเสียบสาย OTG"
        }

        // ช่องที่ 3: สถานะบัตรประชาชน
        if (!connected) {
            binding.dotCardStatus.setBackgroundResource(R.drawable.shape_circle_red)
            binding.tvCardDetail.text = "ไม่มีเครื่องอ่าน\nรอเชื่อมต่อ"
            resetPreviewUi()
        } else if (hasCard) {
            binding.dotCardStatus.setBackgroundResource(R.drawable.shape_circle_green)
            binding.tvCardDetail.text = "พบบัตรแล้ว\nพร้อมดึงข้อมูล"
        } else {
            binding.dotCardStatus.setBackgroundResource(R.drawable.shape_circle_yellow)
            binding.tvCardDetail.text = "ยังไม่เสียบบัตร\nรอเสียบบัตร"
            resetPreviewUi()
        }
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
