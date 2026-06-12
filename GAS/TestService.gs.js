/**
 * TestService.gs
 * Handles Pre-test and Post-test creation, loading, answering, and scoring
 */

const TestService = {
  /**
   * บันทึกคำถามของชุดข้อสอบ (Batch Update/Insert)
   */
  saveQuestions: function(payload) {
    // payload = { trainingId, testType, questions: [{ order, questionText, imageUrl, optionA, optionB, optionC, optionD, correctAnswer, score }] }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      throw new Error("ไม่สามารถเซฟข้อสอบได้ขณะนี้ กรุณาลองใหม่อีกครั้ง");
    }

    try {
      const sheet = SheetService.ensureSheetExists(CONFIG.SHEETS.QUESTIONS);

      // ดึงคำถามที่มีอยู่เพื่อหาแถวที่ต้องลบออกก่อน (เขียนทับคำถามเดิมของ trainingId + testType)
      const allQ = SheetService.getRecords(CONFIG.SHEETS.QUESTIONS);
      
      // เราจะลบคำถามเดิมของ trainingId และ testType นี้ออกทั้งหมด
      // ค้นหาดัชนีแถวที่ต้องลบ (เริ่มจากแถวท้ายสุดขึ้นไปเพื่อไม่ให้กระทบตำแหน่ง)
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const tIdIndex = headers.indexOf("trainingId");
      const typeIndex = headers.indexOf("testType");

      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][tIdIndex] === payload.trainingId && data[i][typeIndex] === payload.testType) {
          sheet.deleteRow(i + 1);
        }
      }

      // บันทึกคำถามใหม่
      if (payload.questions && payload.questions.length > 0) {
        const toInsert = payload.questions.map((q, idx) => {
          return {
            questionId: `Q-${payload.trainingId.replace("TRN-", "")}-${payload.testType}-${idx + 1}`,
            trainingId: payload.trainingId,
            testType: payload.testType,
            order: idx + 1,
            questionText: q.questionText,
            imageUrl: q.imageUrl || "",
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            score: Number(q.score) || 1
          };
        });
        
        SheetService.insertRecords(CONFIG.SHEETS.QUESTIONS, toInsert);
      }

      return { success: true, message: "บันทึกชุดข้อสอบเรียบร้อยแล้ว" };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ดึงข้อสอบของหัวข้อการอบรม
   */
  getQuestions: function(trainingId, testType) {
    const list = SheetService.getRecords(CONFIG.SHEETS.QUESTIONS);
    return list
      .filter(q => q.trainingId === trainingId && q.testType === testType)
      .sort((a, b) => Number(a.order) - Number(b.order));
  },

  /**
   * ส่งคำตอบ ตรวจสอบคะแนน และบันทึก
   */
  submitAnswers: function(payload) {
    // payload = { trainingId, testType, participantId, answers: [{ questionId, selectedAnswer }] }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) throw new Error("ส่งคำตอบล้มเหลวเนื่องจากระบบล็อค");

    try {
      // 1. ดึงข้อสอบเฉลยมาตรวจคำตอบ
      const questions = this.getQuestions(payload.trainingId, payload.testType);
      if (questions.length === 0) throw new Error("ไม่พบชุดข้อสอบนี้ในระบบ");

      let totalScore = 0;
      let totalMaxScore = 0;
      const toInsertAnswers = [];

      payload.answers.forEach(ans => {
        const q = questions.find(item => item.questionId === ans.questionId);
        if (q) {
          const isCorrect = q.correctAnswer === ans.selectedAnswer;
          const scoreEarned = isCorrect ? Number(q.score) : 0;
          totalScore += scoreEarned;
          totalMaxScore += Number(q.score);

          toInsertAnswers.push({
            answerId: `ANS-${new Date().getTime()}-${Math.floor(Math.random()*1000)}`,
            questionId: ans.questionId,
            trainingId: payload.trainingId,
            testType: payload.testType,
            participantId: payload.participantId,
            selectedAnswer: ans.selectedAnswer,
            isCorrect: isCorrect,
            score: scoreEarned,
            submittedAt: new Date()
          });
        }
      });

      // 2. บันทึกรายละเอียดคำตอบของรายข้อ
      SheetService.insertRecords(CONFIG.SHEETS.ANSWERS, toInsertAnswers);

      return {
        totalScore,
        totalMaxScore,
        message: `ส่งคำตอบสำเร็จ! ได้คะแนน ${totalScore}/${totalMaxScore}`
      };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ดึงคะแนนทั้งหมดของหัวข้อจัดอบรม
   */
  getScores: function(trainingId) {
    const answers = SheetService.getRecords(CONFIG.SHEETS.ANSWERS);
    const trainAnswers = answers.filter(a => a.trainingId === trainingId);

    // จัดกลุ่มตามผู้เข้าสอบและประเภทการสอบ
    const scoresMap = {}; // { participantId: { pre: score, post: score } }
    trainAnswers.forEach(ans => {
      const pId = ans.participantId;
      if (!scoresMap[pId]) {
        scoresMap[pId] = { pre: null, post: null, preMax: 0, postMax: 0 };
      }
      
      const testType = ans.testType.toLowerCase();
      if (testType === 'pre') {
        scoresMap[pId].pre = (scoresMap[pId].pre || 0) + Number(ans.score);
      } else {
        scoresMap[pId].post = (scoresMap[pId].post || 0) + Number(ans.score);
      }
    });

    return scoresMap;
  }
};
