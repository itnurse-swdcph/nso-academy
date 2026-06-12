/**
 * AnalyticsService.gs
 * Compiles test results, registration states, and satisfaction feedback into dashboard analytics
 */

const AnalyticsService = {
  /**
   * คำนวณสรุปสถิติสำหรับ Dashboard
   */
  getTrainingAnalytics: function(trainingId) {
    // 1. ข้อมูลผู้ลงทะเบียนทั้งหมด
    const registrations = SheetService.getRecords(CONFIG.SHEETS.REGISTRATIONS)
      .filter(r => r.trainingId === trainingId);

    const approvedRegs = registrations.filter(r => r.status === "APPROVED" || r.status === "CONFIRMED");
    const pendingRegs = registrations.filter(r => r.status === "PENDING" || !r.status);

    // 2. คำนวณคะแนน Pre-test และ Post-test
    const answers = SheetService.getRecords(CONFIG.SHEETS.ANSWERS)
      .filter(a => a.trainingId === trainingId);

    // หาผู้เรียนทั้งหมดที่ตอบข้อสอบ
    const participantIds = [...new Set(answers.map(a => a.participantId))];

    let preTotal = 0, preCount = 0;
    let postTotal = 0, postCount = 0;
    let passCount = 0, failCount = 0;

    // คำนวณรายคน
    participantIds.forEach(pId => {
      const pAnswers = answers.filter(a => a.participantId === pId);
      
      const preAnswers = pAnswers.filter(a => a.testType === "PRE");
      const postAnswers = pAnswers.filter(a => a.testType === "POST");

      if (preAnswers.length > 0) {
        const preScore = preAnswers.reduce((sum, a) => sum + Number(a.score || 0), 0);
        preTotal += preScore;
        preCount++;
      }

      if (postAnswers.length > 0) {
        const postScore = postAnswers.reduce((sum, a) => sum + Number(a.score || 0), 0);
        postTotal += postScore;
        postCount++;

        // สมมติเกณฑ์ผ่านอบรมคือ ได้คะแนน 60% ของการทำข้อสอบ (เช่น สมมติมี 10 ข้อ เกณฑ์ผ่านคือ 6 คะแนน)
        // เพื่อให้ง่าย สมมติว่าคะแนนผ่านคือครึ่งหนึ่งหรือ 6 คะแนนขึ้นไป
        if (postScore >= 6) {
          passCount++;
        } else {
          failCount++;
        }
      }
    });

    const preTestAvg = preCount > 0 ? (preTotal / preCount) : 0;
    const postTestAvg = postCount > 0 ? (postTotal / postCount) : 0;
    
    // อัตราการปรับปรุงการเรียนรู้ (Learning Improvement %)
    const improvementPercent = preTestAvg > 0 ? (((postTestAvg - preTestAvg) / preTestAvg) * 100) : 0;

    // 3. ความพึงพอใจ
    const satisfactionForms = SheetService.getRecords(CONFIG.SHEETS.SATISFACTION_FORMS)
      .filter(f => f.trainingId === trainingId);
    
    const satisfactionResponses = SheetService.getRecords(CONFIG.SHEETS.SATISFACTION_RESPONSES)
      .filter(r => r.trainingId === trainingId);

    // คำนวณความพึงพอใจแต่ละหัวข้อ
    let overallSatSum = 0;
    let overallSatCount = 0;

    const satisfactionDetails = satisfactionForms
      .filter(f => f.questionType === "RATING")
      .map(f => {
        const questionResponses = satisfactionResponses.filter(r => r.formQuestionId === f.formQuestionId);
        const ratings = questionResponses.map(r => Number(r.ratingValue)).filter(v => !isNaN(v));
        
        let avgScore = 0;
        if (ratings.length > 0) {
          avgScore = ratings.reduce((sum, v) => sum + v, 0) / ratings.length;
          overallSatSum += avgScore;
          overallSatCount++;
        }

        return {
          questionId: f.formQuestionId,
          questionText: f.questionText,
          avgScore: avgScore
        };
      });

    const satisfactionAvg = overallSatCount > 0 ? (overallSatSum / overallSatCount) : 0;

    return {
      totalRegistrations: registrations.length,
      approvedCount: approvedRegs.length,
      pendingCount: pendingRegs.length,
      preTestAvg,
      postTestAvg,
      improvementPercent,
      passCount,
      failCount,
      satisfactionAvg,
      satisfactionDetails
    };
  }
};
