package com.anping.cardagent

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.util.Log

/**
 * กิจกรรมดักจับเหตุการณ์การเสียบสาย USB Smart Card Reader (Trampoline Activity)
 * 
 * วัตถุประสงค์:
 * 1. ช่วยให้ระบบ Android แสดงกล่องข้อความที่มีตัวเลือก "ใช้เป็นค่าเริ่มต้นสำหรับอุปกรณ์นี้" (Always allow)
 *    เพื่อให้ผู้ใช้ติ๊กถูกครั้งเดียว แล้วไม่ต้องกดยืนยันทุกครั้งที่เสียบสายอีกต่อไป
 * 2. เป็นกิจกรรมโปร่งใส (Translucent) ไม่แสดงหน้าต่างกราฟิกใดๆ และปิดตัวเองทันที (finish)
 *    ส่งผลให้ผู้ใช้ทำงานบนหน้าเว็บเบราว์เซอร์ต่อได้อย่างต่อเนื่อง โดยไม่มีหน้าจอแอปกระพริบขึ้นมาบัง
 */
class UsbAttachActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // ปิดอนิเมชั่นการเปิดหน้าต่างเพื่อให้ทำงานได้เรียบเนียนที่สุด
        try {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        } catch (_: Exception) {}

        val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
        }

        Log.i("UsbAttachActivity", "USB device attached intent received: ${device?.productName ?: device?.deviceName}")

        try {
            // สั่งเริ่มหรืออัปเดต Service เพื่อเชื่อมต่ออุปกรณ์ในพื้นหลัง
            val serviceIntent = Intent(this, CardReaderService::class.java).apply {
                if (device != null) {
                    putExtra(UsbManager.EXTRA_DEVICE, device)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }

            // หาก Service กำลังทำงานอยู่แล้ว ให้แนบอุปกรณ์และเปิดไดรเวอร์ทันที
            if (device != null) {
                CardReaderService.instance?.initDriver(device)
            }
        } catch (e: Exception) {
            Log.e("UsbAttachActivity", "Error delegating USB device to service: ${e.message}")
        }

        // ปิดกิจกรรมนี้ทันที เพื่อคืนการแสดงผลให้กับหน้าเว็บเบราว์เซอร์
        finish()
        try {
            @Suppress("DEPRECATION")
            overridePendingTransition(0, 0)
        } catch (_: Exception) {}
    }
}
