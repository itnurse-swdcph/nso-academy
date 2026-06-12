/**
 * Code.gs
 * Main entry point for the Google Apps Script Web App.
 * Handles GET/POST requests, acts as a router, and provides Spreadsheet menus.
 */

const SCRIPT_VERSION = "1.1.0";

/**
 * ฟังก์ชันสร้างเมนูผู้ดูแลใน Google Sheets (เมื่อเปิดไฟล์)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏥 ระบบอบรม NSO")
    .addItem("⚙️ Setup Spreadsheet (ติดตั้งชีตใหม่)", "menuSetupSpreadsheet")
    .addItem("📦 Populate Sample Data (ใส่ข้อมูลทดสอบ)", "menuPopulateSampleData")
    .addItem("🔄 Reset Cache (ล้างข้อมูลแคช)", "menuResetCache")
    .addItem("🔍 Validate System (ตรวจสอบและซ่อมตาราง)", "menuValidateSystem")
    .addToUi();
}

// Wrapper ฟังก์ชันสำหรับ Menu Items (เรียกผ่าน UI ไม่สามารถคืนค่า JSON)
function menuSetupSpreadsheet() {
  const res = SetupService.setupSpreadsheet();
  SpreadsheetApp.getUi().alert("ผลการทำงาน", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuPopulateSampleData() {
  try {
    const res = SetupService.populateSampleData();
    SpreadsheetApp.getUi().alert("ผลการทำงาน", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    SpreadsheetApp.getUi().alert("ข้อผิดพลาด", e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function menuResetCache() {
  const res = SetupService.resetCache();
  SpreadsheetApp.getUi().alert("ผลการทำงาน", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuValidateSystem() {
  const res = SetupService.validateSystem();
  SpreadsheetApp.getUi().alert("ผลการทำงาน", res.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * ฟังก์ชันเริ่มต้นโครงสร้างระบบแบบอัตโนมัติ (Defensive Initialization)
 */
function initializeSystem() {
  try {
    SetupService.validateSystem();
  } catch (e) {
    console.error("Failed to initialize sheets structure dynamically: ", e);
  }
}

function doGet(e) {
  // สั่งให้ระบบเช็คและเตรียมตารางอัตโนมัติเมื่อมีการเรียกเว็บเพจ
  initializeSystem();
  return HtmlService.createHtmlOutput("<h3>ระบบลงทะเบียนอบรมออนไลน์ ภารกิจการพยาบาล รพ.สมเด็จพระยุพราชสว่างแดนดิน (GAS API v" + SCRIPT_VERSION + ")</h3><p>สถานะเซิร์ฟเวอร์: ออนไลน์และพร้อมใช้งาน</p>");
}

function doPost(e) {
  initializeSystem();
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let params = {};
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    }

    const action = params.action;
    const payload = params.payload;
    let responseData = null;

    // Routing System
    switch (action) {
      // ── Trainings ──
      case "getTrainings":
        responseData = TrainingService.getActiveTrainings();
        break;
      case "getTrainingById":
        responseData = TrainingService.getTrainingById(payload.trainingId);
        break;
      case "createTraining":
        responseData = TrainingService.createTraining(payload);
        break;
      case "getTrainingSessions":
        responseData = TrainingService.getTrainingSessions(payload.trainingId);
        break;
      case "validateManagementCode":
        responseData = TrainingService.validateManagementCode(payload.trainingId, payload.code);
        break;

      // ── Registrations ──
      case "register":
        responseData = RegistrationService.registerUser(payload);
        break;
      case "getRegistrations":
        responseData = RegistrationService.getRegistrations(payload.sessionId);
        break;
      case "getRegistrationsByTraining":
        responseData = RegistrationService.getRegistrationsByTraining(payload.trainingId);
        break;
      case "approveParticipant":
        responseData = RegistrationService.approveParticipant(payload.regId);
        break;
      case "rejectParticipant":
        responseData = RegistrationService.rejectParticipant(payload.regId);
        break;

      // ── Staff Lookup ──
      case "searchParticipants":
        responseData = ParticipantService.searchParticipants(payload.query);
        break;
      case "getAllParticipants":
        responseData = ParticipantService.getAllParticipants();
        break;

      // ── Pre/Post Tests ──
      case "saveQuestions":
        responseData = TestService.saveQuestions(payload);
        break;
      case "getQuestions":
        responseData = TestService.getQuestions(payload.trainingId, payload.testType);
        break;
      case "submitAnswers":
        responseData = TestService.submitAnswers(payload);
        break;
      case "getScores":
        responseData = TestService.getScores(payload.trainingId);
        break;

      // ── Satisfaction Forms ──
      case "saveSatisfactionForm":
        responseData = SatisfactionService.saveForm(payload);
        break;
      case "getSatisfactionForm":
        responseData = SatisfactionService.getForm(payload.trainingId);
        break;
      case "submitSatisfaction":
        responseData = SatisfactionService.submitResponse(payload);
        break;

      // ── Analytics ──
      case "getAnalytics":
        responseData = AnalyticsService.getTrainingAnalytics(payload.trainingId);
        break;

      // ── Exports ──
      case "exportAnalyticsExcel":
        responseData = ExportService.exportAnalyticsExcel(payload.trainingId);
        break;

      // ── Setup & Admin ──
      case "setupSpreadsheet":
        responseData = SetupService.setupSpreadsheet();
        break;
      case "getSampleData":
        responseData = SetupService.populateSampleData();
        break;
      case "validateSystem":
        responseData = SetupService.validateSystem();
        break;

      default:
        throw new Error("ไม่พบ Action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: responseData || [],
      message: "ดำเนินการสำเร็จ",
      error: ""
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error in API Router: ", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      data: [],
      message: error.message || "เกิดข้อผิดพลาดในการประมวลผลบนเซิร์ฟเวอร์",
      error: error.message || "Unknown server error"
    })).setMimeType(ContentService.MimeType.JSON);
  }
}