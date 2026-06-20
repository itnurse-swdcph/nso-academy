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

    // 2.1 รายละเอียดรายบุคคล (สำหรับตาราง "วิเคราะห์ผลการเรียนรู้")
    // ใช้ regs เพื่อ map participantId -> fullName (เอาเฉพาะคนที่มีคำตอบข้อสอบอย่างน้อย 1 ชุด)
    const regByParticipant = {};
    registrations.forEach(r => { regByParticipant[r.participantId] = r; });

    const individualResults = participantIds.map(pId => {
      const pAnswers = answers.filter(a => a.participantId === pId);
      const preAnswers = pAnswers.filter(a => a.testType === "PRE");
      const postAnswers = pAnswers.filter(a => a.testType === "POST");

      const preScore = preAnswers.length > 0 ? preAnswers.reduce((s, a) => s + Number(a.score || 0), 0) : null;
      const postScore = postAnswers.length > 0 ? postAnswers.reduce((s, a) => s + Number(a.score || 0), 0) : null;

      const reg = regByParticipant[pId];

      return {
        fullName: reg ? reg.fullName : pId, // ถ้าไม่พบในรายชื่อลงทะเบียน ให้ fallback เป็นรหัสบุคลากร
        preScore: preScore,
        postScore: postScore,
        // เกณฑ์เดียวกับ passCount/failCount ด้านบน คือ Post-test >= 6 คะแนน
        passed: postScore !== null ? postScore >= 6 : false
      };
    });

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

    // 3.1 แจกแจงคะแนนรายบุคคลแบบไม่ระบุตัวตน (สำหรับตาราง "วิเคราะห์ความพึงพอใจ")
    // จัดกลุ่มคำตอบตาม participantId ภายในฟังก์ชันนี้เท่านั้น แล้วตัด participantId ทิ้งก่อนส่งออกไปยัง client
    // เรียงคำตอบตามลำดับคำถาม (order) ของแบบฟอร์ม เพื่อให้ตรงคอลัมน์ "ข้อ 1 - ข้อ N" เสมอ
    const ratingForms = satisfactionForms
      .filter(f => f.questionType === "RATING")
      .sort((a, b) => Number(a.order) - Number(b.order));

    const respondentIds = [...new Set(
      satisfactionResponses
        .filter(r => r.ratingValue !== "" && r.ratingValue !== null && r.ratingValue !== undefined)
        .map(r => r.participantId)
    )];

    const satisfactionResponsesAnon = respondentIds.map(pId => {
      const personResponses = satisfactionResponses.filter(r => r.participantId === pId);
      const orderedAnswers = ratingForms.map(f => {
        const found = personResponses.find(r => r.formQuestionId === f.formQuestionId);
        const v = found ? Number(found.ratingValue) : null;
        return isNaN(v) ? null : v;
      });
      // ไม่แนบ participantId / fullName ใด ๆ — มีเฉพาะ array คะแนนคำตอบเท่านั้น
      return { answers: orderedAnswers };
    });

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
      satisfactionDetails,
      individualResults,
      satisfactionResponses: satisfactionResponsesAnon
    };
  }
};
