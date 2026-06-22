/**
 * ExportService.gs
 * Compiles raw data and formats it for client-side download/export
 */

const ExportService = {
  /**
   * ดึงข้อมูลดิบสำหรับ Export Excel รายงานผลการเรียนรู้รายบุคคล
   */
  exportAnalyticsExcel: function(trainingId) {
    const regs = SheetService.getRecords(CONFIG.SHEETS.REGISTRATIONS)
      .filter(r => r.trainingId === trainingId);

    const questions = SheetService.getRecords(CONFIG.SHEETS.QUESTIONS)
      .filter(q => q.trainingId === trainingId);

    const answers = SheetService.getRecords(CONFIG.SHEETS.ANSWERS)
      .filter(a => a.trainingId === trainingId);

    const satResponses = SheetService.getRecords(CONFIG.SHEETS.SATISFACTION_RESPONSES)
      .filter(r => r.trainingId === trainingId);

    // คำนวณคะแนนของแต่ละคน
    return regs.map(r => {
      const pId = r.participantId;
      
      const pAnswers = answers.filter(a => a.participantId === pId);
      const preScore = pAnswers.filter(a => a.testType === "PRE").reduce((sum, a) => sum + Number(a.score || 0), 0);
      const postScore = pAnswers.filter(a => a.testType === "POST").reduce((sum, a) => sum + Number(a.score || 0), 0);

      // คำนวณความพึงพอใจเฉลี่ยของแต่ละคน
      const pSat = satResponses.filter(sr => sr.participantId === pId && sr.ratingValue !== "");
      const satAvg = pSat.length > 0 ? (pSat.reduce((sum, sr) => sum + Number(sr.ratingValue), 0) / pSat.length) : 0;

      return {
        "รหัสพนักงาน": pId,
        "ชื่อ-นามสกุล": r.fullName,
        "ตำแหน่ง": r.position,
        "หน่วยงาน": r.department,
        "สถานะอนุมัติ": r.status,
        "คะแนน Pre-test": preScore,
        "คะแนน Post-test": postScore,
        "พัฒนาการด้านความรู้ (%)": preScore > 0 ? (((postScore - preScore) / preScore) * 100).toFixed(1) + "%" : "0%",
        "คะแนนความพึงพอใจเฉลี่ย": satAvg > 0 ? satAvg.toFixed(2) : "ไม่ได้ประเมิน",
        "เวลาที่ลงทะเบียน": r.registeredAt
      };
    });
  },

  /**
   * Export เฉพาะข้อมูลผลการเรียนรู้ (Pre/Post-test รายบุคคล) ของหัวข้ออบรมหนึ่ง ๆ
   * บันทึก snapshot ลงชีต LearningExport (สร้างอัตโนมัติหากยังไม่มี) แล้วคืนข้อมูลให้ client
   * เขียนทับเฉพาะแถวของ trainingId นี้เท่านั้น ไม่กระทบ trainingId อื่นหรือชีตข้อมูลหลัก
   */
  exportLearningExcel: function(trainingId) {
    const analytics = AnalyticsService.getTrainingAnalytics(trainingId);
    const individuals = analytics.individualResults || [];
    const now = new Date();

    const rows = individuals.map(p => {
      const pre = p.preScore;
      const post = p.postScore;
      const improvement = (pre !== null && pre > 0 && post !== null)
        ? (((post - pre) / pre) * 100).toFixed(1) + "%"
        : "-";

      return {
        trainingId: trainingId,
        fullName: p.fullName,
        preScore: pre !== null ? pre : "",
        postScore: post !== null ? post : "",
        improvementPercent: improvement,
        passed: p.passed ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์",
        exportedAt: now
      };
    });

    // ล้าง snapshot เดิมของ trainingId นี้ก่อน แล้วเขียนชุดล่าสุดทับ (ไม่กระทบ trainingId อื่น ๆ ในชีตเดียวกัน)
    SheetService.deleteRecordsByKey(CONFIG.SHEETS.LEARNING_EXPORT, "trainingId", trainingId);
    if (rows.length > 0) {
      SheetService.insertRecords(CONFIG.SHEETS.LEARNING_EXPORT, rows);
    }

    return individuals.map(p => ({
      "ชื่อ-นามสกุล": p.fullName,
      "คะแนน Pre-test": p.preScore !== null ? p.preScore : "",
      "คะแนน Post-test": p.postScore !== null ? p.postScore : "",
      "ผลการประเมิน": p.passed ? "ผ่านเกณฑ์" : "ไม่ผ่านเกณฑ์"
    }));
  },

  /**
   * Export เฉพาะข้อมูลความพึงพอใจรายบุคคลแบบไม่ระบุตัวตนของหัวข้ออบรมหนึ่ง ๆ
   * - สลับลำดับ (shuffle) ก่อนบันทึก/ส่งออก เพื่อไม่ให้ย้อนกลับไปหาผู้ตอบจริงได้
   * - ไม่มีฟิลด์ participantId / fullName ติดไปกับข้อมูลเลย
   * - บันทึก snapshot ลงชีต SatisfactionExport (สร้างอัตโนมัติหากยังไม่มี)
   * *** BUG FIX: เพิ่มคอลัมน์ "ตำแหน่ง" และ "ข้อเสนอแนะ" ในผลลัพธ์ Excel ***
   */
  exportSatisfactionExcel: function(trainingId) {
    const analytics = AnalyticsService.getTrainingAnalytics(trainingId);
    const responses = (analytics.satisfactionResponses || []).map(r => ({
      answers: [...(r.answers || [])],
      position: r.position || '',
      suggestions: r.suggestions || ''
    }));

    // Fisher–Yates shuffle ฝั่งเซิร์ฟเวอร์ (ครอบคลุม position และ suggestions ด้วย)
    for (let i = responses.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = responses[i];
      responses[i] = responses[j];
      responses[j] = tmp;
    }

    const now = new Date();
    const rows = responses.map((r, idx) => {
      const validAnswers = r.answers.filter(v => v !== null && v !== undefined && !isNaN(v));
      const avg = validAnswers.length > 0 ? (validAnswers.reduce((s, v) => s + v, 0) / validAnswers.length) : 0;
      return {
        trainingId: trainingId,
        anonLabel: `คนที่ ${idx + 1}`,
        position: r.position,
        answersJson: JSON.stringify(r.answers),
        avgScore: avg ? avg.toFixed(2) : "",
        suggestions: r.suggestions,
        exportedAt: now
      };
    });

    SheetService.deleteRecordsByKey(CONFIG.SHEETS.SATISFACTION_EXPORT, "trainingId", trainingId);
    if (rows.length > 0) {
      SheetService.insertRecords(CONFIG.SHEETS.SATISFACTION_EXPORT, rows);
    }

    // คืนข้อมูลแบบ flat ให้ client: ลำดับ, ตำแหน่ง, ข้อ 1 - ข้อ N, คะแนนรวม, ข้อเสนอแนะ
    const questionCount = responses.reduce((max, r) => Math.max(max, r.answers.length), 0);
    return responses.map((r, idx) => {
      const obj = {
        "ลำดับ": `คนที่ ${idx + 1}`,
        "ตำแหน่ง": r.position || "-"
      };
      for (let i = 0; i < questionCount; i++) {
        obj[`ข้อ ${i + 1}`] = r.answers[i] !== null && r.answers[i] !== undefined ? r.answers[i] : "";
      }
      const validAnswers = r.answers.filter(v => v !== null && v !== undefined && !isNaN(v));
      const total = validAnswers.length > 0 ? validAnswers.reduce((s, v) => s + Number(v), 0) : 0;
      obj["คะแนนรวม"] = validAnswers.length > 0 ? total : "";
      obj["เฉลี่ย"] = validAnswers.length > 0 ? (total / validAnswers.length).toFixed(2) : "";
      obj["ข้อเสนอแนะ"] = r.suggestions || "-";
      return obj;
    });
  }
};
