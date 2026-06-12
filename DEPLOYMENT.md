# คู่มือการติดตั้งและใช้งานระบบ (Deployment Guide)

ระบบลงทะเบียนอบรมออนไลน์สำหรับภารกิจการพยาบาล โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน ประกอบด้วย 2 ส่วนหลัก:
1. **Frontend**: หน้าจอผู้ใช้งานรูปแบบ Single Page Application (SPA) โฮสต์อยู่บน **GitHub Pages**
2. **Backend**: ระบบจัดการฐานข้อมูลทำงานผ่าน **Google Apps Script (GAS)** เชื่อมโยงกับ **Google Sheets**

---

## ขั้นตอนที่ 1: เตรียมฐานข้อมูลบน Google Sheets

1. เข้าไปที่ [Google Sheets](https://sheets.google.com) และสร้าง Spreadsheets ใหม่ขึ้นมา 1 ไฟล์
2. ตั้งชื่อตามต้องการ เช่น `NSO Training Database`
3. คัดลอก **Spreadsheet ID** จาก URL
   * ตัวอย่าง URL: `https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J/edit...`
   * Spreadsheet ID คือ: `1A2B3C4D5E6F7G8H9I0J`
4. ปล่อยชีตเริ่มต้นเป็นชีตว่างเปล่าธรรมดา (ระบบ Setup จะสร้างชีตทั้งหมดให้ท่านเองโดยอัตโนมัติ)

---

## ขั้นตอนที่ 2: ติดตั้งและเชื่อมต่อ Google Apps Script (GAS)

1. ในไฟล์ Google Sheets ที่สร้างไว้ คลิกที่เมนู **ส่วนขยาย (Extensions)** -> **Apps Script**
2. คัดลอกไฟล์รหัสทั้งหมดจากโฟลเดอร์ `GAS/` ในโครงงานนี้ ไปวางในโครงการ Apps Script
   * สร้างไฟล์ `.gs` ให้ตรงตามชื่อไฟล์ เช่น:
     * `Config.gs`
     * `Code.gs`
     * `SheetService.gs`
     * `TrainingService.gs`
     * `RegistrationService.gs`
     * `ParticipantService.gs`
     * `TestService.gs`
     * `SatisfactionService.gs`
     * `AnalyticsService.gs`
     * `ExportService.gs`
     * `SetupService.gs`
3. เปิดไฟล์ `Config.gs` และนำ Spreadsheet ID ที่คัดลอกไว้ในขั้นตอนแรก ไปวางในฟิลด์:
   ```javascript
   SPREADSHEET_ID: "นำ ID ของท่านมาวางตรงนี้",
   ```
4. กดปุ่มบันทึก (รูปแผ่นดิสก์) เพื่อเซฟไฟล์ทั้งหมด

---

## ขั้นตอนที่ 3: เริ่มต้นตั้งค่าตารางข้อมูล (Database Initialize Setup)

1. ในหน้า Apps Script ให้เลือกฟังก์ชัน `setupSpreadsheet` ที่แถบเครื่องมือด้านบน
2. คลิกปุ่ม **เรียกใช้ (Run)**
3. Google จะขอสิทธิ์การเข้าถึงข้อมูล (Authorization Required)
   * คลิก **ตรวจสอบสิทธิ์ (Review Permissions)**
   * เลือกบัญชี Google ของท่าน
   * คลิก **ขั้นสูง (Advanced)** และคลิก **ไปที่... (unsafe/ไม่ปลอดภัย)**
   * คลิก **อนุญาต (Allow)**
4. รอจนแถบสถานะแจ้งว่ารันเสร็จสิ้น ชีตทั้ง 12 ชีตจะถูกสร้างใน Google Sheets ของท่านทันที
5. (แนะนำสำหรับการเริ่มต้น) เปลี่ยนฟังก์ชันด้านบนเป็น `populateSampleData` แล้วคลิก **เรียกใช้ (Run)** อีกครั้ง เพื่อใส่รายชื่อบุคลากรจำลอง (20 คน) และหลักสูตรอบรมจำลองสำหรับการทดสอบระบบ

---

## ขั้นตอนที่ 4: เผยแพร่ API (Deploy Web App)

1. ในหน้า Apps Script มุมบนขวา คลิกปุ่ม **การทำให้ใช้งานได้ (Deploy)** -> **การทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกรูปฟันเฟือง เลือกประเภทเป็น **เว็บแอป (Web app)**
3. ตั้งค่ารายละเอียดดังนี้:
   * **คำอธิบาย (Description)**: `NSO Academy API v1`
   * **เรียกใช้ในฐานะ (Execute as)**: `ฉัน (อีเมลของท่าน)`
   * **ผู้มีสิทธิ์เข้าถึง (Who has access)**: `ทุกคน (Anyone)` (สำคัญมาก เพื่อให้เว็บแอปพลิเคชันจากภายนอกสามารถส่งข้อมูลลงทะเบียนได้)
4. คลิกปุ่ม **ทำให้ใช้งานได้ (Deploy)**
5. คัดลอก **URL ของเว็บแอป (Web App URL)** ที่ได้มา
   * ตัวอย่าง URL: `https://script.google.com/macros/s/AKfycb.../exec`

---

## ขั้นตอนที่ 5: เชื่อมต่อ Frontend เข้ากับ Backend API

1. เปิดไฟล์ `js/api.js` ในโครงงานของคุณ
2. ค้นหาบรรทัดที่ 9 และนำ URL ของเว็บแอปที่คัดลอกไว้มาใส่แทนที่:
   ```javascript
   URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
3. บันทึกไฟล์ `js/api.js`

---

## ขั้นตอนที่ 6: อัปโหลดและเปิดใช้งานผ่าน GitHub Pages

1. นำไฟล์โครงงานทั้งหมดขึ้นไปยัง Repository บน GitHub ของคุณ
2. ไปที่ Repository บน GitHub -> คลิกแท็บ **Settings**
3. ที่เมนูด้านซ้าย เลือก **Pages**
4. ในส่วนของ **Build and deployment**:
   * Source: `Deploy from a branch`
   * Branch: เลือก `main` (หรือกิ่งที่คุณใช้งาน) และเลือกโฟลเดอร์ `/ (root)`
5. กดปุ่ม **Save**
6. รอประมาณ 1-2 นาที GitHub จะแสดงลิงก์เว็บไซต์ของท่าน (เช่น `https://username.github.io/repository-name/`)
7. เข้าสู่ระบบและเริ่มต้นใช้งานได้เลย!
