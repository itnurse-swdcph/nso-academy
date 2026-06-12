/**
 * ParticipantService.gs
 * Handles staff database searching and retrieval
 */

const ParticipantService = {
  /**
   * ดึงข้อมูลพนักงานทั้งหมด (Cached)
   */
  getAllParticipants: function() {
    return SheetService.getCached("all_participants", () => {
      return SheetService.getRecords(CONFIG.SHEETS.PARTICIPANTS);
    }, 900); // แคช 15 นาที
  },

  /**
   * ค้นหารายชื่อพนักงานพิมพ์อัตโนมัติ (Typeahead Search)
   * ค้นหาจากชื่อ-นามสกุล, รหัสบุคลากร หรือหน่วยงาน
   */
  searchParticipants: function(query) {
    if (!query) return [];
    
    const cleanQuery = query.trim().toLowerCase();
    const list = this.getAllParticipants();

    return list.filter(p => {
      return (
        (p.participantId && p.participantId.toString().toLowerCase().includes(cleanQuery)) ||
        (p.fullName && p.fullName.toLowerCase().includes(cleanQuery)) ||
        (p.department && p.department.toLowerCase().includes(cleanQuery))
      );
    }).slice(0, 15); // จำกัดผลลัพธ์สูงสุด 15 รายการเพื่อความรวดเร็ว
  },

  /**
   * ดึงข้อมูลพนักงานเดี่ยวๆ
   */
  getParticipantById: function(id) {
    const list = this.getAllParticipants();
    const found = list.find(p => p.participantId.toString() === id.toString());
    if (!found) throw new Error("ไม่พบข้อมูลบุคลากรนี้");
    return found;
  }
};
