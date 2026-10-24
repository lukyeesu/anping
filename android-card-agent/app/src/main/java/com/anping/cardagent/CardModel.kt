package com.anping.cardagent

import org.json.JSONObject

data class CardModel(
    val citizenId: String = "",
    val prefixTh: String = "",
    val firstNameTh: String = "",
    val middleNameTh: String = "",
    val lastNameTh: String = "",
    val prefixEn: String = "",
    val firstNameEn: String = "",
    val middleNameEn: String = "",
    val lastNameEn: String = "",
    val dob: String = "",         // รูปแบบ DD/MM/YYYY (พ.ศ.)
    val gender: String = "",      // ชาย / หญิง
    val nationality: String = "",
    val ethnicity: String = "",
    val religion: String = "",
    val address: String = "",     // บ้านเลขที่
    val moo: String = "",         // หมู่ที่ (เฉพาะตัวเลข)
    val road: String = "",        // ถนน / ซอย
    val subDistrict: String = "", // ตำบล / แขวง (ตัดคำนำหน้าออก)
    val district: String = "",    // อำเภอ / เขต (ตัดคำนำหน้าออก)
    val province: String = "",    // จังหวัด
    val issueDate: String = "",   // วันออกบัตร DD/MM/YYYY
    val expireDate: String = "",  // วันหมดอายุ DD/MM/YYYY หรือ "ตลอดชีพ"
    val issuer: String = "",      // หน่วยงานที่ออกบัตร
    val photoBase64: String = ""  // รูปถ่าย Base64 (ถ้ามี)
) {
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("pid", citizenId)
        json.put("citizenId", citizenId)
        json.put("titleName", prefixTh)
        json.put("prefix", prefixTh)
        json.put("fname", firstNameTh)
        json.put("firstName", firstNameTh)
        json.put("middleName", middleNameTh)
        json.put("middleNameTh", middleNameTh)
        json.put("lname", lastNameTh)
        json.put("lastName", lastNameTh)
        json.put("titleEn", prefixEn)
        json.put("firstNameEn", firstNameEn)
        json.put("middleNameEn", middleNameEn)
        json.put("lastNameEn", lastNameEn)
        json.put("dob", dob)
        json.put("gender", gender)
        json.put("nationality", nationality)
        json.put("ethnicity", ethnicity)
        json.put("religion", religion)
        json.put("address", address)
        json.put("moo", moo)
        json.put("road", road)
        json.put("subDistrict", subDistrict)
        json.put("district", district)
        json.put("province", province)
        json.put("issueDate", issueDate)
        json.put("expireDate", expireDate)
        json.put("issuer", issuer)
        if (photoBase64.isNotEmpty()) {
            json.put("photo", "data:image/jpeg;base64,$photoBase64")
            json.put("photoBase64", photoBase64)
        }
        return json
    }
}
