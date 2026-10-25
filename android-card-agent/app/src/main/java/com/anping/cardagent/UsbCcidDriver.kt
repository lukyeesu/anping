package com.anping.cardagent

import android.hardware.usb.*
import android.util.Log

class UsbCcidDriver(
    private val usbManager: UsbManager,
    private val device: UsbDevice
) {
    companion object {
        private const val TAG = "UsbCcidDriver"
        private const val TIMEOUT_MS = 3000

        // CCID Command Message Types
        private const val PC_TO_RDR_ICC_POWER_ON: Byte = 0x62
        private const val PC_TO_RDR_ICC_POWER_OFF: Byte = 0x65
        private const val PC_TO_RDR_GET_SLOT_STATUS: Byte = 0x63
        private const val PC_TO_RDR_XFR_BLOCK: Byte = 0x6F

        // CCID Response Message Types
        private const val RDR_TO_PC_DATA_BLOCK: Byte = 0x80.toByte()
        private const val RDR_TO_PC_SLOT_STATUS: Byte = 0x81.toByte()
    }

    private var connection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var endpointIn: UsbEndpoint? = null
    private var endpointOut: UsbEndpoint? = null
    private var sequenceNumber: Byte = 0

    fun open(): Boolean {
        if (!usbManager.hasPermission(device)) {
            Log.e(TAG, "No permission to access USB device: ${device.deviceName}")
            return false
        }

        var targetInterface: UsbInterface? = null
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            // Class 11 = Smart Card Reader (CCID) Standard
            // Must strictly be Class 11 (or deviceClass 11) to avoid claiming non-smartcard hardware
            if (iface.interfaceClass == 11 || (device.deviceClass == 11 && iface.endpointCount >= 2)) {
                targetInterface = iface
                break
            }
        }

        if (targetInterface == null) {
            Log.e(TAG, "No suitable USB interface found on ${device.deviceName}")
            return false
        }

        var epIn: UsbEndpoint? = null
        var epOut: UsbEndpoint? = null

        for (i in 0 until targetInterface.endpointCount) {
            val ep = targetInterface.getEndpoint(i)
            if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                if (ep.direction == UsbConstants.USB_DIR_IN) epIn = ep
                else if (ep.direction == UsbConstants.USB_DIR_OUT) epOut = ep
            }
        }

        if (epIn == null || epOut == null) {
            Log.e(TAG, "Bulk endpoints (IN/OUT) not found")
            return false
        }

        val conn = usbManager.openDevice(device) ?: return false
        if (!conn.claimInterface(targetInterface, true)) {
            Log.e(TAG, "Failed to claim USB interface")
            conn.close()
            return false
        }

        this.connection = conn
        this.usbInterface = targetInterface
        this.endpointIn = epIn
        this.endpointOut = epOut

        Log.i(TAG, "USB CCID Driver connected to ${device.productName ?: device.deviceName}")
        return true
    }

    /**
     * ตรวจสอบว่ามีบัตรประชาชนเสียบอยู่ในเครื่องอ่านหรือไม่
     */
    @Synchronized
    fun isCardPresent(): Boolean {
        val conn = connection ?: return false
        val epOut = endpointOut ?: return false
        val epIn = endpointIn ?: return false

        return try {
            val req = ByteArray(10)
            req[0] = PC_TO_RDR_GET_SLOT_STATUS
            req[5] = 0 // Slot 0
            req[6] = sequenceNumber++

            val sent = conn.bulkTransfer(epOut, req, req.size, 1000)
            if (sent < 0) return false

            val resp = ByteArray(64)
            val received = conn.bulkTransfer(epIn, resp, resp.size, 1000)
            if (received >= 10 && (resp[0] == RDR_TO_PC_SLOT_STATUS || resp[0] == RDR_TO_PC_DATA_BLOCK)) {
                val iccStatus = resp[7].toInt() and 0x03
                // 0: Present and active, 1: Present and inactive, 2: Not present
                iccStatus == 0 || iccStatus == 1
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "isCardPresent check failed: ${e.message}")
            false
        }
    }

    /**
     * ส่งคำสั่งเปิดเครื่องและจ่ายไฟให้ชิปการ์ด (Power On)
     */
    @Synchronized
    fun powerOn(): Boolean {
        val conn = connection ?: return false
        val epOut = endpointOut ?: return false
        val epIn = endpointIn ?: return false

        return try {
            val req = ByteArray(10)
            req[0] = PC_TO_RDR_ICC_POWER_ON
            req[5] = 0 // Slot 0
            req[6] = sequenceNumber++
            req[7] = 0x00 // 0x00 = Automatic Voltage Selection (ปลอดภัยและเสถียรที่สุดสำหรับ OTG)

            val sent = conn.bulkTransfer(epOut, req, req.size, TIMEOUT_MS)
            if (sent < 0) {
                Log.e(TAG, "Power On request failed")
                return false
            }

            val resp = ByteArray(256)
            val received = conn.bulkTransfer(epIn, resp, resp.size, TIMEOUT_MS)
            if (received >= 10 && resp[0] == RDR_TO_PC_DATA_BLOCK) {
                val bStatus = resp[7].toInt() and 0xFF
                val iccStatus = bStatus and 0x03
                if (iccStatus == 2) {
                    Log.w(TAG, "No card present in slot")
                    return false
                }
                Log.i(TAG, "Card Powered On successfully! ATR bytes: ${received - 10}")
                return true
            }

            Log.w(TAG, "Power On response invalid (bytes: $received)")
            false
        } catch (e: Exception) {
            Log.e(TAG, "powerOn exception: ${e.message}")
            false
        }
    }

    /**
     * ส่งคำสั่ง APDU ไปยังชิปการ์ด และจัดการคำสั่งตอบสนองแบบ 2 ขั้นตอน (ISO 7816-4 T=0 GET RESPONSE อัตโนมัติ)
     */
    @Synchronized
    fun transmitApdu(apdu: ByteArray): ByteArray? {
        val conn = connection ?: return null
        val epOut = endpointOut ?: return null
        val epIn = endpointIn ?: return null

        return try {
            val len = apdu.size
            val req = ByteArray(10 + len)
            req[0] = PC_TO_RDR_XFR_BLOCK
            req[1] = (len and 0xFF).toByte()
            req[2] = ((len shr 8) and 0xFF).toByte()
            req[3] = ((len shr 16) and 0xFF).toByte()
            req[4] = ((len shr 24) and 0xFF).toByte()
            req[5] = 0 // Slot 0
            req[6] = sequenceNumber++
            req[7] = 0 // BWI
            req[8] = 0 // LevelParameter
            req[9] = 0

            System.arraycopy(apdu, 0, req, 10, len)

            val sent = conn.bulkTransfer(epOut, req, req.size, TIMEOUT_MS)
            if (sent < 0) {
                Log.e(TAG, "transmitApdu send failed")
                return null
            }

            val resp = ByteArray(512)
            val received = conn.bulkTransfer(epIn, resp, resp.size, TIMEOUT_MS)
            if (received >= 10 && resp[0] == RDR_TO_PC_DATA_BLOCK) {
                val dataLen = (resp[1].toInt() and 0xFF) or
                        ((resp[2].toInt() and 0xFF) shl 8) or
                        ((resp[3].toInt() and 0xFF) shl 16) or
                        ((resp[4].toInt() and 0xFF) shl 24)

                val payload = ByteArray(dataLen)
                System.arraycopy(resp, 10, payload, 0, dataLen)

                // ตรวจสอบว่าชิปตอบกลับว่ามีข้อมูลพร้อมให้อ่าน (SW1 == 0x61) หรือไม่
                // หาก SW1 == 0x61 ให้ส่งคำสั่ง 00 C0 00 00 [SW2] (GET RESPONSE) เพื่อดึงข้อมูลจริง
                if (payload.size >= 2 && payload[payload.size - 2] == 0x61.toByte()) {
                    val le = payload[payload.size - 1]
                    val getResponseCmd = byteArrayOf(0x00.toByte(), 0xC0.toByte(), 0x00.toByte(), 0x00.toByte(), le)
                    return transmitRaw(getResponseCmd)
                }

                return payload
            }
            null
        } catch (e: Exception) {
            Log.e(TAG, "transmitApdu exception: ${e.message}")
            null
        }
    }

    private fun transmitRaw(apdu: ByteArray): ByteArray? {
        val conn = connection ?: return null
        val epOut = endpointOut ?: return null
        val epIn = endpointIn ?: return null

        return try {
            val len = apdu.size
            val req = ByteArray(10 + len)
            req[0] = PC_TO_RDR_XFR_BLOCK
            req[1] = (len and 0xFF).toByte()
            req[2] = ((len shr 8) and 0xFF).toByte()
            req[3] = ((len shr 16) and 0xFF).toByte()
            req[4] = ((len shr 24) and 0xFF).toByte()
            req[5] = 0
            req[6] = sequenceNumber++

            System.arraycopy(apdu, 0, req, 10, len)

            val sent = conn.bulkTransfer(epOut, req, req.size, TIMEOUT_MS)
            if (sent < 0) return null

            val resp = ByteArray(512)
            val received = conn.bulkTransfer(epIn, resp, resp.size, TIMEOUT_MS)
            if (received >= 10 && resp[0] == RDR_TO_PC_DATA_BLOCK) {
                val dataLen = (resp[1].toInt() and 0xFF) or
                        ((resp[2].toInt() and 0xFF) shl 8) or
                        ((resp[3].toInt() and 0xFF) shl 16) or
                        ((resp[4].toInt() and 0xFF) shl 24)

                val payload = ByteArray(dataLen)
                System.arraycopy(resp, 10, payload, 0, dataLen)
                return payload
            }
            null
        } catch (e: Exception) {
            Log.e(TAG, "transmitRaw exception: ${e.message}")
            null
        }
    }

    /**
     * ดึงข้อมูลรูปถ่ายใบหน้าจากบัตรประชาชน (ขนาดภาพ JPEG ประมาณ 3-5 KB)
     * อ่าน 20 ส่วน (Parts 1..20) แล้วนำมารวมกันเป็นไฟล์ภาพ JPEG สมบูรณ์
     */
    fun readCardPhoto(): ByteArray? {
        val photoBuffer = java.io.ByteArrayOutputStream()
        try {
            for (i in 1..20) {
                val p1 = i.toByte()
                val p2 = (0x7C - i).toByte()
                val cmd = byteArrayOf(
                    0x80.toByte(), 0xB0.toByte(), p1, p2, 0x02.toByte(), 0x00.toByte(), 0xFF.toByte()
                )
                val resp = transmitApdu(cmd) ?: break
                if (resp.isEmpty()) break

                val len = if (resp.size >= 2 && resp[resp.size - 2] == 0x90.toByte() && resp[resp.size - 1] == 0x00.toByte()) {
                    resp.size - 2
                } else {
                    resp.size
                }
                if (len > 0) {
                    photoBuffer.write(resp, 0, len)
                }
            }
            val allBytes = photoBuffer.toByteArray()
            if (allBytes.isNotEmpty()) {
                // ค้นหาตำแหน่งเริ่มต้นของไฟล์ภาพ JPEG (FF D8)
                var startIndex = -1
                for (i in 0 until allBytes.size - 1) {
                    if (allBytes[i] == 0xFF.toByte() && allBytes[i + 1] == 0xD8.toByte()) {
                        startIndex = i
                        break
                    }
                }
                if (startIndex >= 0) {
                    return allBytes.copyOfRange(startIndex, allBytes.size)
                }
                return allBytes
            }
        } catch (e: Exception) {
            Log.w(TAG, "readCardPhoto error: ${e.message}")
        }
        return null
    }

    /**
     * ดึงข้อมูลบัตรประชาชนไทยครบวงจร (ข้อความ + วันที่ + รูปภาพ)
     */
    @Synchronized
    fun readThaiCard(includePhoto: Boolean = true): CardModel? {
        if (!powerOn()) {
            Log.e(TAG, "powerOn failed")
            return null
        }

        // 1. Select MOI Applet
        val selResp = transmitApdu(ThaiCardParser.CMD_SELECT)
        if (selResp == null || selResp.isEmpty()) {
            Log.e(TAG, "Select Applet failed")
            return null
        }

        // 2. Read CID (13 Digits)
        // ส่งคำสั่ง Request -> ระบบจะส่ง GetResponse อัตโนมัติเมื่อพบ 61 0D
        val cidBytes = transmitApdu(ThaiCardParser.CMD_CID_REQ)
        val cid = if (cidBytes != null) ThaiCardParser.parseCid(cidBytes) else ""
        if (cid.isEmpty()) {
            Log.e(TAG, "Read CID returned empty")
            return null
        }

        // 3. Read Personal Info (ชื่อไทย, อังกฤษ, วันเกิด, เพศ)
        val personBytes = transmitApdu(ThaiCardParser.CMD_PERSON_REQ)
        val pInfo = if (personBytes != null) ThaiCardParser.parsePersonalInfo(personBytes) else emptyMap()

        // 4. Read Address (ที่อยู่ตามทะเบียนราษฎร์)
        val addrBytes = transmitApdu(ThaiCardParser.CMD_ADDRESS_REQ)
        val addr = if (addrBytes != null) ThaiCardParser.parseAddress(addrBytes) else emptyMap()

        // 5. Read Issue Date & Expire Date
        val issueBytes = transmitApdu(ThaiCardParser.CMD_ISSUE_REQ)
        val issueDate = if (issueBytes != null) ThaiCardParser.parseDate(issueBytes, false) else ""

        val expireBytes = transmitApdu(ThaiCardParser.CMD_EXPIRE_REQ)
        val expireDate = if (expireBytes != null) ThaiCardParser.parseDate(expireBytes, true) else ""

        // 6. Read Issuer (ผู้ออกบัตร)
        val issuerBytes = transmitApdu(ThaiCardParser.CMD_ISSUER_REQ)
        val issuer = if (issuerBytes != null) ThaiCardParser.parseIssuer(issuerBytes) else ""

        // 7. Read Photo (ถ้าเปิดใช้งาน)
        var photoBase64 = ""
        if (includePhoto) {
            try {
                val photoBytes = readCardPhoto()
                if (photoBytes != null && photoBytes.isNotEmpty()) {
                    photoBase64 = android.util.Base64.encodeToString(photoBytes, android.util.Base64.NO_WRAP)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error encoding photo: ${e.message}")
            }
        }

        // 8. Read Religion (ศาสนาจากชิป)
        val relBytes = transmitApdu(ThaiCardParser.CMD_RELIGION_REQ)
        val religion = if (relBytes != null) ThaiCardParser.parseReligion(relBytes) else ""

        // ตรวจสอบสัญชาติและเชื้อชาติจากหลักแรกของเลขบัตรประชาชน (PID)
        // เลข 1, 2, 3, 4, 5, 8 คือคนสัญชาติไทย
        // เลข 0, 6, 7 คือบุคคลที่ไม่มีสัญชาติไทย / บัตรคนต่างด้าว (บัตรสีชมพู)
        val firstDigit = cid.firstOrNull()
        val isThaiCitizen = firstDigit in listOf('1', '2', '3', '4', '5', '8')
        val nationality = if (isThaiCitizen) "ไทย" else ""
        val ethnicity = if (isThaiCitizen) "ไทย" else ""

        return CardModel(
            citizenId = cid,
            prefixTh = pInfo["titleTh"] ?: "",
            firstNameTh = pInfo["firstTh"] ?: "",
            middleNameTh = pInfo["middleTh"] ?: "",
            lastNameTh = pInfo["lastTh"] ?: "",
            prefixEn = pInfo["titleEn"] ?: "",
            firstNameEn = pInfo["firstEn"] ?: "",
            middleNameEn = pInfo["middleEn"] ?: "",
            lastNameEn = pInfo["lastEn"] ?: "",
            dob = pInfo["dob"] ?: "",
            gender = pInfo["gender"] ?: "ไม่ระบุ",
            nationality = nationality,
            ethnicity = ethnicity,
            religion = religion,
            address = addr["address"] ?: "",
            moo = addr["moo"] ?: "",
            road = addr["road"] ?: "",
            subDistrict = addr["subDistrict"] ?: "",
            district = addr["district"] ?: "",
            province = addr["province"] ?: "",
            issueDate = issueDate,
            expireDate = expireDate,
            issuer = issuer,
            photoBase64 = photoBase64
        )
    }

    @Synchronized
    fun close() {
        try {
            usbInterface?.let { 
                try { connection?.releaseInterface(it) } catch (_: Exception) {} 
            }
            try { connection?.close() } catch (_: Exception) {}
        } catch (e: Exception) {
            Log.e(TAG, "Error closing connection: ${e.message}")
        } finally {
            connection = null
            usbInterface = null
            endpointIn = null
            endpointOut = null
        }
    }
}
