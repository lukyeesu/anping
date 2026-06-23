const fs = require('fs');
const imgBase64 = fs.readFileSync('public/anpingclinic.png').toString('base64');
const gasCode = `
// =========================================================================================
// 1. นำโค้ด 2 ฟังก์ชันนี้ (handleForgotPassword และ handleConfirmResetPassword) ไปวางต่อท้ายไฟล์ .gs ใน Apps Script ของคุณ
// =========================================================================================

function handleForgotPassword(payload) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Staff');
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Sheet Staff not found'})).setMimeType(ContentService.MimeType.JSON);
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var usernameIdx = headers.indexOf('username');
    var emailIdx = headers.indexOf('email');
    var nameIdx = headers.indexOf('name');
    var idIdx = headers.indexOf('id');
    
    if (usernameIdx === -1 || emailIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ไม่พบคอลัมน์ username หรือ email'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var targetUsername = String(payload.username).trim().toLowerCase();
    var userRow = -1;
    var userEmail = '';
    var userName = '';
    var foundUsername = '';
    
    for (var i = 1; i < data.length; i++) {
      var rowUsername = String(data[i][usernameIdx] || '').trim().toLowerCase();
      var rowEmail = String(data[i][emailIdx] || '').trim().toLowerCase();
      
      if (rowUsername === targetUsername || rowEmail === targetUsername) {
        userRow = i;
        userEmail = String(data[i][emailIdx] || '').trim();
        userName = String(data[i][nameIdx] || 'ผู้ใช้งาน');
        foundUsername = String(data[i][usernameIdx] || '');
        break;
      }
    }
    
    if (userRow === -1) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ไม่พบผู้ใช้งานหรืออีเมลนี้ในระบบ'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!userEmail) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'บัญชีนี้ยังไม่ได้ลงทะเบียนอีเมลไว้ ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาติดต่อผู้ดูแลระบบ'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Generate Token (UUID)
    var token = Utilities.getUuid();
    
    // Store in CacheService for 1 hour (3600 seconds)
    var cache = CacheService.getScriptCache();
    cache.put('RESET_' + token, (userRow + 1).toString(), 3600); // เก็บหมายเลขแถว (1-indexed)
    
    // Create Reset Link
    var resetUrl = payload.resetUrl || 'http://localhost:5173';
    var link = resetUrl + '?reset_token=' + token;
    
    // HTML Email Template
    var htmlBody = \`
      <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px; background-color: white; padding: 30px 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- ใช้ Inline Image อ้างอิงจาก cid:logo -->
          <img src="cid:logo" alt="Anping Clinic Logo" style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid #e0f2fe; margin-bottom: 15px;" />
          <h1 style="color: #0284c7; margin: 0; font-size: 26px; font-weight: bold;">อันผิงคลินิก (Anping Clinic)</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 15px;">ระบบจัดการคลินิกอัจฉริยะ</p>
        </div>
        
        <div style="background-color: white; padding: 35px 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">คำขอรีเซ็ตรหัสผ่าน 🔑</h2>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">สวัสดีคุณ <strong>\${userName}</strong>,</p>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีผู้ใช้งาน <strong>\${foundUsername}</strong> ของคุณ</p>
          <p style="color: #334155; line-height: 1.7; font-size: 15px;">หากคุณเป็นผู้ดำเนินการ กรุณาคลิกที่ปุ่มด้านล่างเพื่อตั้งค่ารหัสผ่านใหม่ของคุณครับ</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="\${link}" style="background-color: #0ea5e9; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.39);">ตั้งค่ารหัสผ่านใหม่</a>
          </div>
          
          <div style="background-color: #fff1f2; border: 1px solid #ffe4e6; padding: 12px; border-radius: 8px; margin-bottom: 25px;">
            <p style="color: #e11d48; font-size: 13px; text-align: center; margin: 0; font-weight: 500;">⚠️ ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง เพื่อความปลอดภัย</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6;">หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่านนี้ โปรดละเว้นอีเมลฉบับนี้ รหัสผ่านเดิมของคุณจะยังคงใช้งานได้ตามปกติ หรือคุณสามารถติดต่อผู้ดูแลระบบได้ทันที</p>
          </div>
        </div>
      </div>
    \`;
    
    // Base64 ของรูปภาพ anpingclinic.png
    var logoBase64 = "${imgBase64}";
    var logoBlob = Utilities.newBlob(Utilities.base64Decode(logoBase64), "image/png", "anpingclinic.png");
    
    // ส่งอีเมลพร้อมรูปภาพ Inline
    MailApp.sendEmail({
      to: userEmail,
      subject: "คำขอรีเซ็ตรหัสผ่าน - อันผิงคลินิก (Anping Clinic)",
      htmlBody: htmlBody,
      inlineImages: {
        logo: logoBlob
      }
    });
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Sent email'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleConfirmResetPassword(payload) {
  try {
    var token = payload.token;
    var newPassword = payload.newPassword;
    
    if (!token || !newPassword) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ข้อมูลไม่ครบถ้วน'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var cache = CacheService.getScriptCache();
    var rowStr = cache.get('RESET_' + token);
    
    if (!rowStr) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือไม่ถูกต้อง'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var rowNum = parseInt(rowStr);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Staff');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var passIdx = headers.indexOf('password');
    
    if (passIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'ไม่พบคอลัมน์ password'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Update password (passIdx is 0-indexed, getRange is 1-indexed)
    sheet.getRange(rowNum, passIdx + 1).setValue(newPassword);
    
    // ลบ Token ออกจาก Cache ทันทีที่ใช้เสร็จ เพื่อป้องกันการใช้ซ้ำ
    cache.remove('RESET_' + token);
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'เปลี่ยนรหัสผ่านสำเร็จ'})).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================================
// 2. ไปที่ฟังก์ชัน doPost(e) ที่มีอยู่เดิมของคุณ แล้วเพิ่มเงื่อนไข IF สองบรรทัดนี้เข้าไปในนั้น:
/*

  if (action === 'FORGOT_PASSWORD') {
    return handleForgotPassword(payload);
  }
  
  if (action === 'CONFIRM_RESET_PASSWORD') {
    return handleConfirmResetPassword(payload);
  }

*/
// =========================================================================================
`;
fs.writeFileSync('GAS_ForgotPassword.js', gasCode);
console.log('Successfully generated GAS_ForgotPassword.js');
