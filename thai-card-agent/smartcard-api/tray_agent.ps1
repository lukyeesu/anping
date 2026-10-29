# ==============================================================================
# Anping Smart Card Agent - Windows System Tray Controller
# ทำงานใน System Tray (Hide Icons / ถาดการแจ้งเตือน) แบบเดียวกับ Discord / LINE
# ==============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ป้องกันรันซ้ำซ้อน (Single Instance via Mutex)
$mutexName = "Global\AnpingSmartCardTrayMutex"
$mutex = $null
$isNewInstance = $false
try {
    $mutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$isNewInstance)
    if (-not $isNewInstance) {
        [System.Windows.Forms.MessageBox]::Show("Anping Smart Card Agent กำลังเปิดทำงานอยู่ใน System Tray แล้ว`n(ดูที่ไอคอนซ่อนบริเวณมุมขวาล่างของหน้าจอ)", "Anping Card Agent", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        exit
    }
} catch {
    # If mutex check fails, proceed normally
}

# ตัวแปรสถานะ
$script:nodeProcess = $null
$script:isRunning = $false

# ฟังก์ชันสร้าง Icon แบบ Dynamic (การ์ด + จุดสถานะ เขียว/แดง)
function Get-StatusIcon([bool]$active) {
    $bmp = New-Object System.Drawing.Bitmap(16, 16)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # พื้นหลังบัตร Smart Card (สีฟ้าเข้ม)
    $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(14, 165, 233))
    $g.FillRectangle($cardBrush, 1, 3, 14, 10)

    # แถบชิปการ์ดสีเหลืองทอง
    $chipBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(254, 240, 138))
    $g.FillRectangle($chipBrush, 3, 5, 4, 4)

    # จุดสถานะ (เขียว = กำลังทำงาน, แดง = หยุดทำงาน)
    $statusColor = if ($active) { [System.Drawing.Color]::FromArgb(34, 197, 94) } else { [System.Drawing.Color]::FromArgb(239, 68, 68) }
    $dotBrush = New-Object System.Drawing.SolidBrush($statusColor)
    $g.FillEllipse($dotBrush, 9, 7, 6, 6)

    # ขอบรอบจุดสถานะ
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 1)
    $g.DrawEllipse($borderPen, 9, 7, 6, 6)

    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)

    $borderPen.Dispose()
    $dotBrush.Dispose()
    $chipBrush.Dispose()
    $cardBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    return $icon
}

# ฟังก์ชันปิด Process ที่ใช้พอร์ต 8181
function Stop-Port8181Process {
    try {
        $netstat = netstat -ano | Select-String ":8181\s+.*LISTENING\s+(\d+)"
        if ($netstat) {
            foreach ($line in $netstat) {
                if ($line.Matches.Groups.Count -ge 2) {
                    $pidToKill = $line.Matches.Groups[1].Value.Trim()
                    if ($pidToKill -and $pidToKill -ne "0") {
                        Stop-Process -Id ([int]$pidToKill) -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {}
}

# ฟังก์ชันเริ่มรัน Node.js Server
function Start-AgentService {
    if ($script:isRunning) { return }

    # ปิดตัวเก่าที่ค้างในพอร์ต 8181 ก่อน
    Stop-Port8181Process
    Start-Sleep -Milliseconds 300

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node.exe"
    $psi.Arguments = "server.js"
    $psi.WorkingDirectory = $ScriptDir
    $psi.CreateNoWindow = $true
    $psi.UseShellExecute = $false
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

    try {
        $script:nodeProcess = [System.Diagnostics.Process]::Start($psi)
        $script:isRunning = $true

        $script:notifyIcon.Icon = Get-StatusIcon $true
        $script:notifyIcon.Text = "Anping Card Agent: กำลังทำงาน (พอร์ต 8181)"
        $script:statusMenuItem.Text = "🟢 สถานะ: กำลังทำงาน (พอร์ต 8181)"
        $script:toggleMenuItem.Text = "⏹️ ปิดใช้งานชั่วคราว (Stop)"

        $script:notifyIcon.ShowBalloonTip(3000, "อันผิงคลินิก (Anping Smart Card)", "ระบบอ่านบัตรเปิดทำงานแล้ว (พอร์ต 8181) พร้อมอ่านบัตรประชาชนบนเว็บ", [System.Windows.Forms.ToolTipIcon]::Info)
    } catch {
        [System.Windows.Forms.MessageBox]::Show("ไม่สามารถเปิดใช้งาน Node.js ได้ กรุณาตรวจสอบว่าได้ติดตั้ง Node.js บนคอมพิวเตอร์แล้ว", "ข้อผิดพลาด", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
        $script:isRunning = $false
    }
}

# ฟังก์ชันหยุดรัน Node.js Server
function Stop-AgentService {
    try {
        if ($script:nodeProcess -and -not $script:nodeProcess.HasExited) {
            $script:nodeProcess.Kill()
            $script:nodeProcess.Dispose()
        }
    } catch {}

    Stop-Port8181Process
    $script:nodeProcess = $null
    $script:isRunning = $false

    $script:notifyIcon.Icon = Get-StatusIcon $false
    $script:notifyIcon.Text = "Anping Card Agent: หยุดทำงาน"
    $script:statusMenuItem.Text = "🔴 สถานะ: ปิดการทำงานอยู่"
    $script:toggleMenuItem.Text = "▶️ เปิดใช้งาน (Start)"

    $script:notifyIcon.ShowBalloonTip(2000, "อันผิงคลินิก (Anping Smart Card)", "ปิดการทำงานของระบบอ่านบัตรแล้ว", [System.Windows.Forms.ToolTipIcon]::Warning)
}

# สร้าง Tray Icon และ Context Menu
$script:notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$script:notifyIcon.Visible = $true
$script:notifyIcon.Icon = Get-StatusIcon $false

$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$script:statusMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
$script:statusMenuItem.Text = "🔴 สถานะ: กำลังเริ่มต้น..."
$script:statusMenuItem.Enabled = $false
$contextMenu.Items.Add($script:statusMenuItem) | Out-Null

$sep1 = New-Object System.Windows.Forms.ToolStripSeparator
$contextMenu.Items.Add($sep1) | Out-Null

$script:toggleMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
$script:toggleMenuItem.Text = "⏹️ ปิดใช้งานชั่วคราว (Stop)"
$script:toggleMenuItem.add_Click({
    if ($script:isRunning) {
        Stop-AgentService
    } else {
        Start-AgentService
    }
})
$contextMenu.Items.Add($script:toggleMenuItem) | Out-Null

$restartMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
$restartMenuItem.Text = "🔄 รีสตาร์ทเซอร์วิส (Restart)"
$restartMenuItem.add_Click({
    Stop-AgentService
    Start-Sleep -Milliseconds 500
    Start-AgentService
})
$contextMenu.Items.Add($restartMenuItem) | Out-Null

$testMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
$testMenuItem.Text = "🌐 ตรวจสอบสถานะผ่านเบราว์เซอร์"
$testMenuItem.add_Click({
    Start-Process "http://localhost:8181/api/status"
})
$contextMenu.Items.Add($testMenuItem) | Out-Null

$sep2 = New-Object System.Windows.Forms.ToolStripSeparator
$contextMenu.Items.Add($sep2) | Out-Null

$exitMenuItem = New-Object System.Windows.Forms.ToolStripMenuItem
$exitMenuItem.Text = "❌ ออกจากโปรแกรม (Exit)"
$exitMenuItem.add_Click({
    Stop-AgentService
    $script:notifyIcon.Visible = $false
    $script:notifyIcon.Dispose()
    if ($mutex) {
        $mutex.ReleaseMutex()
        $mutex.Dispose()
    }
    [System.Windows.Forms.Application]::Exit()
})
$contextMenu.Items.Add($exitMenuItem) | Out-Null

$script:notifyIcon.ContextMenuStrip = $contextMenu

# ดับเบิ้ลคลิกที่ไอคอนเพื่อสลับเปิด/ปิด
$script:notifyIcon.add_DoubleClick({
    if ($script:isRunning) {
        $script:notifyIcon.ShowBalloonTip(2000, "สถานะ Anping Card Agent", "กำลังทำงานที่พอร์ต 8181 (คลิกขวาเพื่อสั่งปิดหรือตั้งค่า)", [System.Windows.Forms.ToolTipIcon]::Info)
    } else {
        Start-AgentService
    }
})

# เริ่มต้นเปิดเซอร์วิสอัตโนมัติ
Start-AgentService

# ลูปทำงานในพื้นหลัง (Message Loop)
[System.Windows.Forms.Application]::Run()
