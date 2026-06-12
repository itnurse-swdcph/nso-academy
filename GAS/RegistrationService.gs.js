/**
 * RegistrationService.gs
 * Handles participant registrations, duplicate checks, and approval statuses
 */

const RegistrationService = {
  /**
   * ลงทะเบียนเข้าร่วมอบรม
   */
  registerUser: function(payload) {
    // payload = { trainingId, sessionId, participantId, fullName, position, department }
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      throw new Error("ระบบกำลังประมวลผลการจอง กรุณาลองใหม่อีกครั้ง");
    }

    try {
      const allRegs = SheetService.getRecords(CONFIG.SHEETS.REGISTRATIONS);

      // 1. ตรวจสอบลงทะเบียนซ้ำ
      const isDuplicate = allRegs.some(r => 
        r.trainingId === payload.trainingId && 
        r.participantId === payload.participantId && 
        r.status !== "REJECTED"
      );
      if (isDuplicate) {
        throw new Error("บุคลากรรายนี้ได้ลงทะเบียนหลักสูตรนี้ไปแล้ว");
      }

      // 2. ตรวจสอบจำนวนที่นั่ง
      const sessions = SheetService.getRecords(CONFIG.SHEETS.SESSIONS);
      const targetSession = sessions.find(s => s.sessionId === payload.sessionId);
      if (!targetSession) throw new Error("ไม่พบรอบอบรมที่เลือก");

      const sessionRegCount = allRegs.filter(r => r.sessionId === payload.sessionId && r.status !== "REJECTED").length;
      if (sessionRegCount >= Number(targetSession.maxSeats)) {
        throw new Error(`รอบการอบรมนี้เต็มแล้ว (จำกัด ${targetSession.maxSeats} ที่นั่ง)`);
      }

      // 3. ทำการบันทึก
      const regId = `REG-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
      const newReg = {
        regId: regId,
        sessionId: payload.sessionId,
        trainingId: payload.trainingId,
        participantId: payload.participantId,
        fullName: payload.fullName,
        position: payload.position,
        department: payload.department,
        status: "PENDING", // PENDING approval by default
        registeredAt: new Date()
      };

      SheetService.insertRecords(CONFIG.SHEETS.REGISTRATIONS, [newReg]);

      return {
        regId: regId,
        message: "ลงทะเบียนสำเร็จ รอการอนุมัติเข้าร่วมอบรม"
      };

    } finally {
      lock.releaseLock();
    }
  },

  /**
   * ดึงข้อมูลผู้ลงทะเบียนตาม Session ID
   */
  getRegistrations: function(sessionId) {
    const regs = SheetService.getRecords(CONFIG.SHEETS.REGISTRATIONS);
    return regs.filter(r => r.sessionId === sessionId);
  },

  /**
   * ดึงข้อมูลผู้ลงทะเบียนของ Training ID ทั้งหมด
   */
  getRegistrationsByTraining: function(trainingId) {
    const regs = SheetService.getRecords(CONFIG.SHEETS.REGISTRATIONS);
    return regs.filter(r => r.trainingId === trainingId);
  },

  /**
   * อนุมัติผู้สมัครเข้าร่วมอบรม
   */
  approveParticipant: function(regId) {
    const ok = SheetService.updateRecord(CONFIG.SHEETS.REGISTRATIONS, "regId", regId, { status: "APPROVED" });
    if (!ok) throw new Error("ไม่พบรายการลงทะเบียนที่ระบุ");
    return { success: true };
  },

  /**
   * ปฏิเสธการเข้าร่วมอบรม
   */
  rejectParticipant: function(regId) {
    const ok = SheetService.updateRecord(CONFIG.SHEETS.REGISTRATIONS, "regId", regId, { status: "REJECTED" });
    if (!ok) throw new Error("ไม่พบรายการลงทะเบียนที่ระบุ");
    return { success: true };
  }
};