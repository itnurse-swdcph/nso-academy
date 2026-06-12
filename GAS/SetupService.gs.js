/**
 * SetupService.gs
 * Initializes Google Sheets and inserts initial sample data
 */

const SetupService = {
  /**
   * สร้างชีตและหัวตารางทั้งหมดตามโครงสร้างฐานข้อมูล (12 ตาราง)
   */
  setupSpreadsheet: function() {
    const db = SheetService.getDb();
    
    for (let sheetName in SCHEMAS) {
      let sheet = db.getSheetByName(sheetName);
      if (!sheet) {
        sheet = db.insertSheet(sheetName);
      }
      
      // ล้างข้อมูลและใส่หัวตารางใหม่
      sheet.clear();
      const headers = SCHEMAS[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ปรับปรุงการแสดงผลหัวตารางเบื้องต้น (ตัวหนา พื้นหลังเทาอ่อน)
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#f1f5f9")
        .setHorizontalAlignment("center");
      
      // ตรึงแถวแรก
      sheet.setFrozenRows(1);
    }

    // ลบชีตเริ่มต้นที่ชื่อ "Sheet1" หรือ "ชีต1" หากไม่ได้ใช้งาน
    const defaultSheet1 = db.getSheetByName("Sheet1") || db.getSheetByName("ชีต1");
    if (defaultSheet1 && db.getSheets().length > 1) {
      try {
        db.deleteSheet(defaultSheet1);
      } catch (e) {}
    }

    return { success: true, message: "สร้างตารางข้อมูลและตั้งค่าหัวข้อเรียบร้อยแล้วทั้ง 12 ตาราง!" };
  },

  /**
   * ตรวจสอบว่าระบบตารางพร้อมใช้งานหรือไม่ ถ้าตารางหายไปจะสร้างขึ้นมาให้ทันที
   */
  validateSystem: function() {
    const db = SheetService.getDb();
    const results = [];
    let fixedAny = false;

    for (let sheetName in SCHEMAS) {
      let sheet = db.getSheetByName(sheetName);
      if (!sheet) {
        SheetService.ensureSheetExists(sheetName);
        results.push(`สร้างชีต ${sheetName} ใหม่เนื่องจากไม่พบในระบบ`);
        fixedAny = true;
      } else {
        // ตรวจสอบ headers
        const data = sheet.getDataRange().getValues();
        const currentHeaders = data[0] || [];
        const requiredHeaders = SCHEMAS[sheetName];
        let headersMatch = true;

        if (currentHeaders.length < requiredHeaders.length) {
          headersMatch = false;
        } else {
          for (let i = 0; i < requiredHeaders.length; i++) {
            if (currentHeaders[i] !== requiredHeaders[i]) {
              headersMatch = false;
              break;
            }
          }
        }

        if (!headersMatch) {
          // ซ่อมแซม headers
          sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
          sheet.getRange(1, 1, 1, requiredHeaders.length)
            .setFontWeight("bold")
            .setBackground("#f1f5f9")
            .setHorizontalAlignment("center");
          results.push(`ซ่อมแซมหัวตารางของชีต ${sheetName}`);
          fixedAny = true;
        }
      }
    }

    if (!fixedAny) {
      return { success: true, message: "ตรวจสอบโครงสร้างระบบเรียบร้อย: ทุกชีตอยู่ในสถานะปกติสมบูรณ์" };
    } else {
      return { success: true, message: "ปรับปรุงโครงสร้างระบบสำเร็จ: " + results.join(", ") };
    }
  },

  /**
   * เคลียร์แคชระบบ
   */
  resetCache: function() {
    SheetService.clearCache("active_trainings");
    SheetService.clearCache("all_participants");
    return { success: true, message: "ล้างข้อมูลแคชทั้งหมดเรียบร้อยแล้ว!" };
  },

  /**
   * ใส่ข้อมูลตัวอย่าง (พนักงาน 20 คน และวิชาอบรมจำลอง)
   */
  populateSampleData: function() {
    const db = SheetService.getDb();
    
    const partSheet = SheetService.ensureSheetExists(CONFIG.SHEETS.PARTICIPANTS);

    const existingParticipants = SheetService.getRecords(CONFIG.SHEETS.PARTICIPANTS);
    if (existingParticipants.length === 0) {
      const sampleStaff = [
        { participantId: "10001", fullName: "นางสาวสมศรี ใจดี", position: "พยาบาลวิชาชีพชำนาญการพิเศษ", department: "ผู้ป่วยนอก (OPD)", isActive: true },
        { participantId: "10002", fullName: "นางสมรัก รักพยาบาล", position: "พยาบาลวิชาชีพชำนาญการ", department: "ผู้ป่วยในหญิง", isActive: true },
        { participantId: "10003", fullName: "นายพิชิต ชนะศึก", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "อุบัติเหตุและฉุกเฉิน (ER)", isActive: true },
        { participantId: "10004", fullName: "นางสาวพรทิพย์ สุวรรณ", position: "พยาบาลวิชาชีพชำนาญการ", department: "ไอซียู (ICU)", isActive: true },
        { participantId: "10005", fullName: "นางสาวดาริกา รักษ์ดี", position: "พยาบาลวิชาชีพชำนาญการ", department: "ห้องผ่าตัด (OR)", isActive: true },
        { participantId: "10006", fullName: "นางสาววารุณี มาดี", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "ผู้ป่วยในชาย", isActive: true },
        { participantId: "10007", fullName: "นางสาวรัตนา แก้วดี", position: "ผู้ช่วยพยาบาล", department: "ผู้ป่วยนอก (OPD)", isActive: true },
        { participantId: "10008", fullName: "นายธนพล แสนคำ", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "อุบัติเหตุและฉุกเฉิน (ER)", isActive: true },
        { participantId: "10009", fullName: "นางสาวนภาลัย มีสุข", position: "พยาบาลวิชาชีพชำนาญการ", department: "ห้องคลอด (LR)", isActive: true },
        { participantId: "10010", fullName: "นางสาวกานดา ทรงประเสริฐ", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "กุมารเวชกรรม", isActive: true },
        { participantId: "10011", fullName: "นางวิภาวรรณ สุขสันต์", position: "พยาบาลวิชาชีพชำนาญการ", department: "ห้องผ่าตัด (OR)", isActive: true },
        { participantId: "10012", fullName: "นางสาวพัชรินทร์ เกื้อหนุน", position: "ผู้ช่วยพยาบาล", department: "ผู้ป่วยในหญิง", isActive: true },
        { participantId: "10013", fullName: "นางสุภารัตน์ แซ่ตั้ง", position: "พยาบาลวิชาชีพชำนาญการ", department: "ไอซียู (ICU)", isActive: true },
        { participantId: "10014", fullName: "นายอนุรักษ์ ป้องกัน", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "ผู้ป่วยในชาย", isActive: true },
        { participantId: "10015", fullName: "นางสาวศิริพร บุญช่วย", position: "พยาบาลวิชาชีพชำนาญการพิเศษ", department: "กุมารเวชกรรม", isActive: true },
        { participantId: "10016", fullName: "นางสาวชลิตา วงศ์ดี", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "ห้องคลอด (LR)", isActive: true },
        { participantId: "10017", fullName: "นางจิตรา สมบูรณ์", position: "ผู้ช่วยพยาบาล", department: "อุบัติเหตุและฉุกเฉิน (ER)", isActive: true },
        { participantId: "10018", fullName: "นางสาวรุ่งนภา พรมมา", position: "พยาบาลวิชาชีพชำนาญการ", department: "ผู้ป่วยนอก (OPD)", isActive: true },
        { participantId: "10019", fullName: "นางสาวอารียา ปรีชา", position: "พยาบาลวิชาชีพปฏิบัติการ", department: "กุมารเวชกรรม", isActive: true },
        { participantId: "10020", fullName: "นางวรรณภา งามตา", position: "พยาบาลวิชาชีพชำนาญการ", department: "ห้องผ่าตัด (OR)", isActive: true }
      ];
      SheetService.insertRecords(CONFIG.SHEETS.PARTICIPANTS, sampleStaff);
      SheetService.clearCache("all_participants");
    }

    // 2. ใส่ข้อมูลหัวข้ออบรมจำลอง (Trainings)
    const existingTrainings = SheetService.getRecords(CONFIG.SHEETS.TRAININGS);
    
    if (existingTrainings.length === 0) {
      const sampleTrainingId = "TRN-SAMPLE-001";
      const sampleTraining = {
        trainingId: sampleTrainingId,
        title: "การฟื้นคืนชีพขั้นสูงสำหรับพยาบาลวิชาชีพ (Advanced CPR 2026)",
        organizer: "กลุ่มงานการจัดการเรียนรู้อบรมและวิจัย",
        location: "ห้องประชุมพุทธรักษา ชั้น 4 อาคารผู้ป่วยนอก",
        managementCode: "NSO999",
        status: "ACTIVE",
        createdAt: new Date()
      };
      
      SheetService.insertRecords(CONFIG.SHEETS.TRAININGS, [sampleTraining]);

      const sampleSessions = [
        { sessionId: "SES-SAMPLE-1", trainingId: sampleTrainingId, sessionDate: "2026-06-25", startTime: "09:00", endTime: "12:00", maxSeats: 30 },
        { sessionId: "SES-SAMPLE-2", trainingId: sampleTrainingId, sessionDate: "2026-06-25", startTime: "13:00", endTime: "16:00", maxSeats: 30 }
      ];
      SheetService.insertRecords(CONFIG.SHEETS.SESSIONS, sampleSessions);

      const sampleQuestions = [
        {
          questionId: "Q-SAMPLE-PRE-1", trainingId: sampleTrainingId, testType: "PRE", order: 1,
          questionText: "ขั้นตอนแรกของการทำ CPR เมื่อพบผู้หมดสติตามแนวทาง AHA 2020 คืออะไร?",
          optionA: "เริ่มกดหน้าอกทันที", optionB: "ประเมินความปลอดภัยของสถานที่", optionC: "โทร 1669 ขอความช่วยเหลือ", optionD: "เช็คชีพจรและความรู้สึกตัว",
          correctAnswer: "B", score: 1
        },
        {
          questionId: "Q-SAMPLE-PRE-2", trainingId: sampleTrainingId, testType: "PRE", order: 2,
          questionText: "ความลึกที่เหมาะสมในการกดหน้าอกผู้ใหญ่คือเท่าใด?",
          optionA: "อย่างน้อย 2 นิ้ว แต่ไม่เกิน 2.4 นิ้ว", optionB: "ประมาณ 1.5 นิ้ว", optionC: "ลึกเท่าใดก็ได้ตามแรง", optionD: "อย่างน้อย 3 นิ้ว",
          correctAnswer: "A", score: 1
        },
        {
          questionId: "Q-SAMPLE-POST-1", trainingId: sampleTrainingId, testType: "POST", order: 1,
          questionText: "ขั้นตอนแรกของการทำ CPR เมื่อพบผู้หมดสติตามแนวทาง AHA 2020 คืออะไร?",
          optionA: "เริ่มกดหน้าอกทันที", optionB: "ประเมินความปลอดภัยของสถานที่", optionC: "โทร 1669 ขอความช่วยเหลือ", optionD: "เช็คชีพจรและความรู้สึกตัว",
          correctAnswer: "B", score: 1
        },
        {
          questionId: "Q-SAMPLE-POST-2", trainingId: sampleTrainingId, testType: "POST", order: 2,
          questionText: "ความลึกที่เหมาะสมในการกดหน้าอกผู้ใหญ่คือเท่าใด?",
          optionA: "อย่างน้อย 2 นิ้ว แต่ไม่เกิน 2.4 นิ้ว", optionB: "ประมาณ 1.5 นิ้ว", optionC: "ลึกเท่าใดก็ได้ตามแรง", optionD: "อย่างน้อย 3 นิ้ว",
          correctAnswer: "A", score: 1
        }
      ];
      SheetService.insertRecords(CONFIG.SHEETS.QUESTIONS, sampleQuestions);

      const sampleSat = [
        { formQuestionId: "SFQ-SAMPLE-1", trainingId: sampleTrainingId, order: 1, questionText: "ความรู้ความเข้าใจในเนื้อหาวิชาการอบรมครั้งนี้", questionType: "RATING", isRequired: true },
        { formQuestionId: "SFQ-SAMPLE-2", trainingId: sampleTrainingId, order: 2, questionText: "ความสามารถในการถ่ายทอดและอธิบายของวิทยากร", questionType: "RATING", isRequired: true },
        { formQuestionId: "SFQ-SAMPLE-3", trainingId: sampleTrainingId, order: 3, questionText: "ความเหมาะสมของสถานที่และอุปกรณ์โสตทัศนูปกรณ์", questionType: "RATING", isRequired: true },
        { formQuestionId: "SFQ-SAMPLE-4", trainingId: sampleTrainingId, order: 4, questionText: "ข้อเสนอแนะเพิ่มเติมสำหรับการปรับปรุงครั้งต่อไป", questionType: "TEXT", isRequired: false }
      ];
      SheetService.insertRecords(CONFIG.SHEETS.SATISFACTION_FORMS, sampleSat);

      const sampleRegs = [
        { regId: "REG-SAMPLE-1", sessionId: "SES-SAMPLE-1", trainingId: sampleTrainingId, participantId: "10001", fullName: "นางสาวสมศรี ใจดี", position: "พยาบาลวิชาชีพชำนาญการพิเศษ", department: "ผู้ป่วยนอก (OPD)", status: "APPROVED", registeredAt: new Date() },
        { regId: "REG-SAMPLE-2", sessionId: "SES-SAMPLE-1", trainingId: sampleTrainingId, participantId: "10002", fullName: "นางสมรัก รักพยาบาล", position: "พยาบาลวิชาชีพชำนาญการ", department: "ผู้ป่วยในหญิง", status: "PENDING", registeredAt: new Date() }
      ];
      SheetService.insertRecords(CONFIG.SHEETS.REGISTRATIONS, sampleRegs);

      SheetService.clearCache("active_trainings");
    }

    return { success: true, message: "เพิ่มข้อมูลตัวอย่างจำลองเรียบร้อยแล้ว!" };
  }
};
