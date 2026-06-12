/**
 * TrainingService.gs
 * Handles CRUD operations for Training Courses and Sessions
 */

const TrainingService = {
  /**
   * คืนค่ารายการอบรมทั้งหมด พร้อมข้อมูลจำนวนรอบและวันจัดอบรมแรกสุด
   */
  getActiveTrainings: function() {
    return SheetService.getCached("active_trainings", () => {
      const trainings = SheetService.getRecords(CONFIG.SHEETS.TRAININGS);
      const sessions = SheetService.getRecords(CONFIG.SHEETS.SESSIONS);

      return trainings.map(t => {
        const trainSessions = sessions.filter(s => s.trainingId === t.trainingId);
        
        // ค้นหารอบที่เร็วที่สุด
        let nextDate = "";
        if (trainSessions.length > 0) {
          const parseDate = (dStr) => new Date(String(dStr).split('~')[0]);
          const sorted = trainSessions.sort((a, b) => parseDate(a.sessionDate) - parseDate(b.sessionDate));
          nextDate = sorted[0].sessionDate;
        }

        return {
          trainingId: t.trainingId,
          title: t.title,
          organizer: t.organizer,
          location: t.location,
          status: t.status,
          createdAt: t.createdAt,
          sessionCount: trainSessions.length,
          startDate: nextDate
        };
      });
    }, CONFIG.CACHE_TTL);
  },

  /**
   * ดึงรายละเอียดวิชาอบรมตาม ID
   */
  getTrainingById: function(trainingId) {
    const trainings = SheetService.getRecords(CONFIG.SHEETS.TRAININGS);
    const found = trainings.find(t => t.trainingId === trainingId);
    if (!found) throw new Error("ไม่พบข้อมูลหลักสูตรที่ระบุ");
    return found;
  },

  /**
   * ดึงรอบทั้งหมดของหลักสูตรอบรม
   */
  getTrainingSessions: function(trainingId) {
    const sessions = SheetService.getRecords(CONFIG.SHEETS.SESSIONS);
    return sessions.filter(s => s.trainingId === trainingId);
  },

  /**
   * สร้างหัวข้ออบรมพร้อมรอบจัดอบรม (Batch)
   */
  createTraining: function(payload) {
    // payload = { title, organizer, location, sessions: [{ sessionDate, startTime, endTime, maxSeats }] }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(8000)) {
      throw new Error("ระบบหนาแน่น กรุณาลองใหม่อีกครั้ง");
    }

    try {
      const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
      const rand = Math.floor(1000 + Math.random() * 9000);
      const trainingId = `TRN-${dateStr}-${rand}`;
      
      // สุ่มรหัสผู้ดูแล 6 หลัก (A-Z, 0-9)
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // เอาตัวที่หน้าตาคล้ายกันออก เช่น I, O, 1, 0
      let managementCode = "";
      for (let i = 0; i < 6; i++) {
        managementCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // บันทึกตัวอบรมหลัก
      const newTraining = {
        trainingId: trainingId,
        title: payload.title,
        organizer: payload.organizer,
        location: payload.location,
        managementCode: managementCode,
        status: "ACTIVE",
        createdAt: new Date()
      };

      SheetService.insertRecords(CONFIG.SHEETS.TRAININGS, [newTraining]);

      // บันทึกรอบจัดอบรม
      if (payload.sessions && payload.sessions.length > 0) {
        const newSessions = payload.sessions.map((s, idx) => {
          return {
            sessionId: `SES-${trainingId.replace("TRN-", "")}-${idx + 1}`,
            trainingId: trainingId,
            sessionDate: s.sessionDate,
            startTime: s.startTime,
            endTime: s.endTime,
            maxSeats: Number(s.maxSeats) || 100
          };
        });
        SheetService.insertRecords(CONFIG.SHEETS.SESSIONS, newSessions);
      }

      // เคลียร์แคช
      SheetService.clearCache("active_trainings");

      return {
        trainingId: trainingId,
        managementCode: managementCode
      };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ยืนยันรหัสการเข้าจัดการระบบ
   */
  validateManagementCode: function(trainingId, code) {
    const training = this.getTrainingById(trainingId);
    if (training.managementCode !== code.trim().toUpperCase()) {
      throw new Error("รหัสการเข้าจัดการไม่ถูกต้อง");
    }
    return { success: true };
  }
};
