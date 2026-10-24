package com.anping.cardagent

import android.util.Log
import java.nio.charset.Charset

object ThaiCardParser {

    private const val TAG = "ThaiCardParser"

    private val TIS620: Charset = try {
        Charset.forName("TIS-620")
    } catch (e: Exception) {
        Charset.forName("TIS620")
    }

    // 1. Select Thai National ID Applet
    val CMD_SELECT = byteArrayOf(
        0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(),
        0x08.toByte(), 0xA0.toByte(), 0x00.toByte(), 0x00.toByte(),
        0x00.toByte(), 0x54.toByte(), 0x48.toByte(), 0x00.toByte(), 0x01.toByte()
    )

    // 2. Command pairs: [Prepare / Select Offset, Get Response]
    val CMD_CID_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x00.toByte(), 0x04.toByte(), 0x02.toByte(), 0x00.toByte(), 0x0D.toByte())
    val CMD_CID_GET = byteArrayOf(0x00.toByte(), 0xC0.toByte(), 0x00.toByte(), 0x00.toByte(), 0x0D.toByte())

    val CMD_PERSON_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x00.toByte(), 0x11.toByte(), 0x02.toByte(), 0x00.toByte(), 0xD1.toByte())
    val CMD_PERSON_GET = byteArrayOf(0x00.toByte(), 0xC0.toByte(), 0x00.toByte(), 0x00.toByte(), 0xD1.toByte())

    val CMD_ADDRESS_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x15.toByte(), 0x79.toByte(), 0x02.toByte(), 0x00.toByte(), 0x64.toByte())
    val CMD_ADDRESS_GET = byteArrayOf(0x00.toByte(), 0xC0.toByte(), 0x00.toByte(), 0x00.toByte(), 0x64.toByte())

    val CMD_ISSUE_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x01.toByte(), 0x67.toByte(), 0x02.toByte(), 0x00.toByte(), 0x08.toByte())
    val CMD_EXPIRE_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x01.toByte(), 0x6F.toByte(), 0x02.toByte(), 0x00.toByte(), 0x08.toByte())
    val CMD_ISSUER_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x00.toByte(), 0xF6.toByte(), 0x02.toByte(), 0x00.toByte(), 0x64.toByte())
    val CMD_RELIGION_REQ = byteArrayOf(0x80.toByte(), 0xB0.toByte(), 0x01.toByte(), 0x77.toByte(), 0x02.toByte(), 0x00.toByte(), 0x02.toByte())

    /**
     * แปลง Byte Array TIS-620 เป็น String
     * ตัดรหัสสถานะ 2 ไบต์ท้าย (เช่น 90 00) ออก
     */
    fun bytesToString(bytes: ByteArray): String {
        if (bytes.isEmpty()) return ""
        val len = if (bytes.size >= 2 && bytes[bytes.size - 2] == 0x90.toByte() && bytes[bytes.size - 1] == 0x00.toByte()) {
            bytes.size - 2
        } else {
            bytes.size
        }
        val clean = bytes.copyOfRange(0, len)
        return String(clean, TIS620).trim()
    }

    fun parseCid(bytes: ByteArray): String {
        val str = bytesToString(bytes)
        return str.replace(Regex("[^0-9]"), "").trim()
    }

    /**
     * แปลงวันที่ YYYYMMDD (พ.ศ.) เช่น 25630514 เป็น 14/05/2563
     * ถ้าวันหมดอายุเป็น 99999999 จะคืนค่าเป็น "ตลอดชีพ"
     */
    fun parseDate(bytes: ByteArray, isExpire: Boolean = false): String {
        val raw = bytesToString(bytes).replace(Regex("[^0-9]"), "").trim()
        if (isExpire && (raw == "99999999" || raw.startsWith("9999"))) {
            return "ตลอดชีพ"
        }
        if (raw.length == 8) {
            val y = raw.substring(0, 4)
            val m = raw.substring(4, 6)
            val d = raw.substring(6, 8)
            return "$d/$m/$y"
        }
        return raw
    }

    fun parseIssuer(bytes: ByteArray): String {
        return bytesToString(bytes).trim()
    }

    /**
     * สกัดข้อมูลศาสนาจากชิปบัตรประชาชน (Offset 01 77 ขนาด 2 ไบต์)
     * รหัสมาตรฐานสำนักบริหารการทะเบียน กรมการปกครอง (BORA):
     * 01 = พุทธ
     * 02 = อิสลาม
     * 03 = คริสต์
     * 04 = พราหมณ์-ฮินดู
     * 05 = ซิกข์
     * 00 / 99 = ไม่ระบุ
     */
    fun parseReligion(bytes: ByteArray): String {
        val str = bytesToString(bytes).trim()
        val digits = str.filter { it.isDigit() }
        val thaiText = str.replace(Regex("^(ศาสนา|ศาสนา\\s*)"), "").trim()

        return when {
            digits == "01" || digits == "1" || thaiText.contains("พุทธ") -> "พุทธ"
            digits == "02" || digits == "2" || thaiText.contains("อิสลาม") -> "อิสลาม"
            digits == "03" || digits == "3" || thaiText.contains("คริสต์") -> "คริสต์"
            digits == "04" || digits == "4" || thaiText.contains("ฮินดู") || thaiText.contains("พราหมณ์") -> "พราหมณ์-ฮินดู"
            digits == "05" || digits == "5" || thaiText.contains("ซิกข์") -> "ซิกข์"
            digits == "00" || digits == "99" || thaiText.contains("ไม่นับถือ") || thaiText.contains("ไม่ระบุ") -> "ไม่ระบุ"
            thaiText.length in 2..20 && thaiText.all { it.isLetter() || it.isWhitespace() } -> thaiText
            else -> ""
        }
    }

    /**
     * โครงสร้างข้อมูลบุคคล (Person Info):
     * ไบต์ 0..99 (100 ไบต์) = ชื่อไทย: คำนำหน้า#ชื่อ#ชื่อกลาง#สกุล#
     * ไบต์ 100..199 (100 ไบต์) = ชื่ออังกฤษ: Title#First#Middle#Last#
     * ไบต์ 200..207 (8 ไบต์) = วันเกิด: YYYYMMDD (พ.ศ.) เช่น 25391130
     * ไบต์ 208 (1 ไบต์) = เพศ: '1' = ชาย, '2' = หญิง
     */
    fun parsePersonalInfo(bytes: ByteArray): Map<String, String> {
        val len = if (bytes.size >= 2 && bytes[bytes.size - 2] == 0x90.toByte() && bytes[bytes.size - 1] == 0x00.toByte()) {
            bytes.size - 2
        } else {
            bytes.size
        }

        var titleTh = ""
        var firstTh = ""
        var lastTh = ""
        var titleEn = ""
        var firstEn = ""
        var lastEn = ""
        var dob = ""
        var gender = "ไม่ระบุ"

        // 1. แยกชื่อภาษาไทย (ไบต์ 0..99)
        var middleTh = ""
        if (len >= 100) {
            val thBytes = bytes.copyOfRange(0, 100)
            val thStr = String(thBytes, TIS620).trim()
            val thParts = thStr.split('#').map { it.trim() }
            titleTh = thParts.getOrNull(0) ?: ""
            firstTh = thParts.getOrNull(1) ?: ""
            middleTh = thParts.getOrNull(2) ?: ""
            if (thParts.size > 3) {
                lastTh = if (thParts[3].isNotEmpty()) thParts[3] else middleTh
                // เก็บรักษาชื่อกลางไว้ ไม่ให้สูญหาย
                if (middleTh.isNotEmpty() && thParts[3].isNotEmpty()) {
                    firstTh = "$firstTh $middleTh".trim()
                }
            } else {
                lastTh = middleTh
            }
        }

        // 2. แยกชื่อภาษาอังกฤษ (ไบต์ 100..199)
        var middleEn = ""
        if (len >= 200) {
            val enBytes = bytes.copyOfRange(100, 200)
            val enStr = String(enBytes, TIS620).trim()
            val enParts = enStr.split('#').map { it.trim() }
            titleEn = enParts.getOrNull(0) ?: ""
            firstEn = enParts.getOrNull(1) ?: ""
            middleEn = enParts.getOrNull(2) ?: ""
            if (enParts.size > 3) {
                lastEn = if (enParts[3].isNotEmpty()) enParts[3] else middleEn
                if (middleEn.isNotEmpty() && enParts[3].isNotEmpty()) {
                    firstEn = "$firstEn $middleEn".trim()
                }
            } else {
                lastEn = middleEn
            }
        }

        // 3. แยกวันเกิด (ไบต์ 200..207) -> Format: YYYYMMDD
        if (len >= 208) {
            val dobBytes = bytes.copyOfRange(200, 208)
            val dobStr = String(dobBytes, Charsets.US_ASCII).trim()
            if (dobStr.length == 8 && dobStr.all { it.isDigit() }) {
                val y = dobStr.substring(0, 4)
                val m = dobStr.substring(4, 6)
                val d = dobStr.substring(6, 8)
                dob = "$d/$m/$y"
            }
        }

        // 4. แยกเพศ (ไบต์ 208) -> '1' = ชาย, '2' = หญิง
        val malePrefixes = listOf("นาย", "นพ.", "ด.ช.", "เด็กชาย", "พระ", "ม.ร.ว.", "mr", "master")
        val femalePrefixes = listOf("นาง", "นางสาว", "น.ส.", "พญ.", "ด.ญ.", "เด็กหญิง", "mrs", "ms", "miss")
        val titleLower = titleTh.lowercase()

        if (len >= 209) {
            val gChar = bytes[208].toInt().toChar()
            gender = when (gChar) {
                '1' -> "ชาย"
                '2' -> "หญิง"
                else -> when {
                    malePrefixes.any { titleLower.contains(it) } -> "ชาย"
                    femalePrefixes.any { titleLower.contains(it) } -> "หญิง"
                    else -> "ไม่ระบุ"
                }
            }
        } else if (titleTh.isNotEmpty()) {
            gender = when {
                malePrefixes.any { titleLower.contains(it) } -> "ชาย"
                femalePrefixes.any { titleLower.contains(it) } -> "หญิง"
                else -> "ไม่ระบุ"
            }
        }

        return mapOf(
            "titleTh" to titleTh,
            "firstTh" to firstTh,
            "middleTh" to middleTh,
            "lastTh" to lastTh,
            "titleEn" to titleEn,
            "firstEn" to firstEn,
            "middleEn" to middleEn,
            "lastEn" to lastEn,
            "dob" to dob,
            "gender" to gender
        )
    }

    /**
     * โครงสร้างที่อยู่ (Address):
     * บ้านเลขที่#หมู่ที่#ตรอก#ซอย#ถนน#ตำบล#อำเภอ#จังหวัด##
     */
    fun parseAddress(bytes: ByteArray): Map<String, String> {
        val raw = bytesToString(bytes)
        val parts = raw.split('#').map { it.trim() }

        val houseNo = if (parts.isNotEmpty()) parts[0] else ""
        val mooRaw = if (parts.size > 1) parts[1] else ""
        // ตัดตัวอักษรออก ให้เหลือเฉพาะตัวเลขหมู่ล้วน เช่น "หมู่ที่ 1" หรือ "ที่ 1" -> "1"
        val moo = mooRaw.replace(Regex("[^0-9]"), "").trim()

        val trok = if (parts.size > 2) parts[2] else ""
        val soi = if (parts.size > 3) parts[3] else ""
        val roadPart = if (parts.size > 4) parts[4] else ""
        val road = listOf(trok, soi, roadPart).filter { it.isNotEmpty() }.joinToString(" ").replace(Regex("^(ถนน|ถ\\.)\\s*"), "").trim()

        val subDistrictRaw = if (parts.size > 5) parts[5] else ""
        val subDistrict = subDistrictRaw.replace(Regex("^(ตำบล|แขวง|ต\\.)\\s*"), "").trim()

        val districtRaw = if (parts.size > 6) parts[6] else ""
        val district = districtRaw.replace(Regex("^(อำเภอ|เขต|อ\\.)\\s*"), "").trim()

        val provinceRaw = if (parts.size > 7) parts[7] else ""
        val province = provinceRaw.replace(Regex("^(จังหวัด|จ\\.)\\s*"), "").trim()

        return mapOf(
            "address" to houseNo,
            "moo" to moo,
            "road" to road,
            "subDistrict" to subDistrict,
            "district" to district,
            "province" to province
        )
    }
}
