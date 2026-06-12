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
  }
};
