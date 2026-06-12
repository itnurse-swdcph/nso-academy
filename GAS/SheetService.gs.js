/**
 * SheetService.gs
 * Handles batch reading, batch writing, updates, and caching for sheets
 * Auto-creates sheets and headers if they do not exist
 */

const SCHEMAS = {
  "Trainings": ["trainingId", "title", "organizer", "location", "managementCode", "status", "createdAt"],
  "Sessions": ["sessionId", "trainingId", "sessionDate", "startTime", "endTime", "maxSeats"],
  "Participants": ["participantId", "fullName", "position", "department", "isActive"],
  "Registrations": ["regId", "sessionId", "trainingId", "participantId", "fullName", "position", "department", "status", "registeredAt"],
  "PreTests": ["preTestId", "trainingId", "participantId", "score", "maxScore", "status", "submittedAt"],
  "PostTests": ["postTestId", "trainingId", "participantId", "score", "maxScore", "status", "submittedAt"],
  "Questions": ["questionId", "trainingId", "testType", "order", "questionText", "imageUrl", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "score"],
  "Answers": ["answerId", "questionId", "trainingId", "testType", "participantId", "selectedAnswer", "isCorrect", "score", "submittedAt"],
  "SatisfactionForms": ["formQuestionId", "trainingId", "order", "questionText", "questionType", "isRequired"],
  "SatisfactionResponses": ["responseId", "formQuestionId", "trainingId", "participantId", "ratingValue", "textValue", "submittedAt"],
  "Analytics": ["analyticsId", "trainingId", "totalRegistrations", "approvedCount", "preTestAvg", "postTestAvg", "improvementPercent", "satisfactionAvg", "calculatedAt"],
  "Config": ["key", "value", "description"]
};

const SheetService = {
  /**
   * ดึง instance ของ Spreadsheet
   */
  getDb: function() {
    if (CONFIG.SPREADSHEET_ID) {
      try {
        return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      } catch (e) {
        console.error("Failed to open spreadsheet by ID, falling back to active: ", e);
      }
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * ตรวจสอบและสร้างชีตหากยังไม่มี
   */
  ensureSheetExists: function(sheetName) {
    const db = this.getDb();
    let sheet = db.getSheetByName(sheetName);
    if (!sheet) {
      sheet = db.insertSheet(sheetName);
      const headers = SCHEMAS[sheetName] || ["id"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f1f5f9")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    return sheet;
  },

  /**
   * อ่านข้อมูลจาก Sheet และแปลงเป็น Array of Objects
   * @param {string} sheetName - ชื่อ Sheet
   */
  getRecords: function(sheetName) {
    const sheet = this.ensureSheetExists(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    return rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  },

  /**
   * เพิ่มข้อมูล (Batch Insert)
   * @param {string} sheetName - ชื่อ Sheet
   * @param {Array<Object>} records - รายการข้อมูลที่ต้องการเพิ่ม
   */
  insertRecords: function(sheetName, records) {
    if (!records || records.length === 0) return;
    const sheet = this.ensureSheetExists(sheetName);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const rowsToAppend = records.map(obj => {
      return headers.map(header => {
        const val = obj[header];
        if (val instanceof Date) {
          return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        }
        return val !== undefined && val !== null ? val : "";
      });
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  },

  /**
   * อัปเดตข้อมูลแถวที่ตรงกับ keyCol/keyVal
   * @param {string} sheetName - ชื่อ Sheet
   * @param {string} keyCol - ชื่อคอลัมน์คีย์หลัก เช่น 'trainingId'
   * @param {any} keyVal - ค่าของคีย์ที่ต้องการค้นหา
   * @param {Object} updates - ฟิลด์และค่าที่ต้องการแก้ไข
   */
  updateRecord: function(sheetName, keyCol, keyVal, updates) {
    const sheet = this.ensureSheetExists(sheetName);

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;

    const headers = data[0];
    const keyColIndex = headers.indexOf(keyCol);
    if (keyColIndex === -1) throw new Error(`ไม่พบหลัก ${keyCol} ในชีต ${sheetName}`);

    for (let i = 1; i < data.length; i++) {
      if (data[i][keyColIndex] === keyVal) {
        const rowNum = i + 1;
        for (let headerName in updates) {
          const colIndex = headers.indexOf(headerName);
          if (colIndex !== -1) {
            let val = updates[headerName];
            if (val instanceof Date) {
              val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            }
            sheet.getRange(rowNum, colIndex + 1).setValue(val);
          }
        }
        return true;
      }
    }
    return false;
  },

  /**
   * ดึงและบันทึกข้อมูลผ่าน CacheService
   * @param {string} key - คีย์ของแคช
   * @param {Function} fetchFn - ฟังก์ชันดึงข้อมูลหากไม่มีแคช
   * @param {number} ttl - อายุแคช (วินาที)
   */
  getCached: function(key, fetchFn, ttl = 300) {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // แคชเสีย ให้โหลดใหม่
      }
    }
    
    const data = fetchFn();
    try {
      cache.put(key, JSON.stringify(data), ttl);
    } catch (e) {
      console.warn("ไม่สามารถเซฟแคชได้: ", e);
    }
    return data;
  },

  /**
   * ล้างแคชด้วย key
   */
  clearCache: function(key) {
    try {
      CacheService.getScriptCache().remove(key);
    } catch (e) {}
  }
};