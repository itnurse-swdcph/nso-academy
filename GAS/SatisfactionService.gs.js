/**
 * SatisfactionService.gs
 * Handles Satisfaction feedback templates and responses
 */

const SatisfactionService = {
  /**
   * บันทึกคำถามความพึงพอใจ
   */
  saveForm: function(payload) {
    // payload = { trainingId, questions: [{ order, questionText, questionType, isRequired }] }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) throw new Error("ระบบล็อกอยู่กรุณาลองใหม่");

    try {
      const sheet = SheetService.ensureSheetExists(CONFIG.SHEETS.SATISFACTION_FORMS);

      // ลบชุดคำถามเดิมของ trainingId
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const tIdIndex = headers.indexOf("trainingId");

      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][tIdIndex] === payload.trainingId) {
          sheet.deleteRow(i + 1);
        }
      }

      // บันทึกใหม่
      if (payload.questions && payload.questions.length > 0) {
        const toInsert = payload.questions.map((q, idx) => {
          return {
            formQuestionId: `SFQ-${payload.trainingId.replace("TRN-", "")}-${idx + 1}`,
            trainingId: payload.trainingId,
            order: idx + 1,
            questionText: q.questionText,
            questionType: q.questionType, // RATING or TEXT
            isRequired: q.isRequired ? true : false
          };
        });
        SheetService.insertRecords(CONFIG.SHEETS.SATISFACTION_FORMS, toInsert);
      }

      return { success: true, message: "บันทึกแบบฟอร์มความพึงพอใจแล้ว" };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ดึงชุดประเมินของอบรมวิชา
   */
  getForm: function(trainingId) {
    const list = SheetService.getRecords(CONFIG.SHEETS.SATISFACTION_FORMS);
    return list
      .filter(f => f.trainingId === trainingId)
      .sort((a, b) => Number(a.order) - Number(b.order));
  },

  /**
   * ส่งผลตอบประเมินความพึงพอใจ
   */
  submitResponse: function(payload) {
    // payload = { trainingId, participantId, responses: [{ formQuestionId, ratingValue, textValue }] }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) throw new Error("ส่งแบบประเมินล้มเหลวเนื่องจากระบบประมวลผลอยู่");

    try {
      const recordsToInsert = payload.responses.map(res => {
        return {
          responseId: `SFR-${new Date().getTime()}-${Math.floor(Math.random()*1000)}`,
          formQuestionId: res.formQuestionId,
          trainingId: payload.trainingId,
          participantId: payload.participantId,
          ratingValue: res.ratingValue !== undefined ? Number(res.ratingValue) : "",
          textValue: res.textValue || "",
          submittedAt: new Date()
        };
      });

      SheetService.insertRecords(CONFIG.SHEETS.SATISFACTION_RESPONSES, recordsToInsert);

      return { success: true, message: "ขอบคุณที่ร่วมทำแบบประเมินความพึงพอใจ" };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ดึงรายการตอบกลับทั้งหมด
   */
  getResponses: function(trainingId) {
    const list = SheetService.getRecords(CONFIG.SHEETS.SATISFACTION_RESPONSES);
    return list.filter(r => r.trainingId === trainingId);
  }
};
