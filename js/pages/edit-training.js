/**
 * edit-training.js — Module 1.1: Edit Training Course (Modal-based)
 * แก้ไขหัวข้ออบรม กำหนดวัน/เวลา และรอบการอบรมใหม่ในรูปแบบ Modal Pop-up
 */

const EditTrainingPage = {
  _sessionCount: 0,

  _escapeTextarea(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  /**
   * เปิด Modal แก้ไขข้อมูลการอบรม
   * @param {string} trainingId - รหัสการอบรม
   * @param {Function} [onSaveSuccess] - callback เมื่อบันทึกสำเร็จ
   */
  async open(trainingId, onSaveSuccess = null) {
    this._sessionCount = 0;

    // Bug 2: Show Loading overlay while fetching initial data
    UI.showLoadingOverlay('กำลังโหลดข้อมูลการอบรม...');

    try {
      const [training, sessions] = await Promise.all([
        API.getTrainingById(trainingId),
        API.getTrainingSessions(trainingId)
      ]);

      UI.hideLoadingOverlay();

      this._showEditModal(training, sessions || [], onSaveSuccess);

    } catch (err) {
      UI.hideLoadingOverlay();
      console.error('[EditTrainingPage] Load error:', err);
      UI.error('ไม่สามารถโหลดข้อมูลการอบรมได้: ' + err.message);
    }
  },

  _showEditModal(training, sessions, onSaveSuccess) {
    const firstSession = sessions[0] || {};
    const isLimited = firstSession.maxSeats && firstSession.maxSeats < 999999;
    const maxSeatsVal = isLimited ? firstSession.maxSeats : '';

    const content = `
      <form id="editTrainingForm" novalidate style="text-align: left;">
        <!-- ข้อมูลพื้นฐาน -->
        <div class="form-section">
          <div class="form-section-title"><i class="fa-solid fa-clipboard-list"></i> ข้อมูลการอบรม</div>
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label" for="editTrainingTitle">
                ชื่อหัวข้อการอบรม <span class="required">*</span>
              </label>
              <input type="text" id="editTrainingTitle" class="form-control"
                value="${training.title || ''}" required maxlength="200">
            </div>
            <div class="form-group">
              <label class="form-label" for="editTrainingOrganizer">
                หน่วยงานที่จัด <span class="required">*</span>
              </label>
              <input type="text" id="editTrainingOrganizer" class="form-control"
                value="${training.organizer || ''}" required maxlength="200">
            </div>
            <div class="form-group">
              <label class="form-label" for="editTrainingLocation">
                สถานที่จัด <span class="required">*</span>
              </label>
              <select id="editTrainingLocation" class="form-control" required>
                <option value="">-- กรุณาเลือกสถานที่จัด --</option>
                <option value="ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${training.location === 'ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                <option value="ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${training.location === 'ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                <option value="ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${training.location === 'ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
              </select>
            </div>
          </div>
          
          <!-- ตั้งค่าจำนวนคนลงทะเบียน -->
          <div class="form-grid" style="margin-top: var(--space-4);">
            <div class="form-group">
              <label class="form-label">จำนวนคนลงทะเบียน <span class="required">*</span></label>
              <div style="display: flex; gap: var(--space-4); align-items: center; margin-top: var(--space-2); height: 40px;">
                <label style="display: flex; align-items: center; gap: var(--space-1); cursor: pointer;">
                  <input type="radio" name="editCapacityType" value="unlimited" ${!isLimited ? 'checked' : ''}> ไม่จำกัด
                </label>
                <label style="display: flex; align-items: center; gap: var(--space-1); cursor: pointer;">
                  <input type="radio" name="editCapacityType" value="limited" ${isLimited ? 'checked' : ''}> จำกัดจำนวนคน
                </label>
              </div>
            </div>
            <div class="form-group ${!isLimited ? 'hidden' : ''}" id="editCapacityLimitGroup">
              <label class="form-label" for="editMaxSeatsInput">
                จำนวนคนสูงสุด (คน) <span class="required">*</span>
              </label>
              <input type="number" id="editMaxSeatsInput" class="form-control"
                min="1" value="${maxSeatsVal}" placeholder="เช่น 50" ${isLimited ? 'required' : ''}>
            </div>
          </div>
        </div>

        <!-- รอบวันเวลา -->
        <div class="form-section">
          <div class="form-section-title"><i class="fa-solid fa-calendar-days"></i> รอบวันและเวลาอบรม</div>
          <div class="form-grid" style="margin-bottom: var(--space-4);">
            <div class="form-group full-width">
              <label class="form-label" for="editTrainingDescription">
                รายละเอียดเพิ่มเติม
              </label>
              <textarea id="editTrainingDescription" class="form-control" rows="5" maxlength="5000"
                placeholder="ระบุรายละเอียดเพิ่มเติม เช่น เงื่อนไขการเข้าร่วม เอกสารที่ต้องเตรียม หรือลิงก์ประกอบการอบรม">${this._escapeTextarea(training.description)}</textarea>
              <div class="form-hint">ข้อมูลนี้จะแสดงในหน้าลงทะเบียนก่อนผู้เข้าอบรมยืนยันการลงทะเบียน</div>
            </div>
          </div>
          <div id="editSessionList" class="session-list"></div>
          <button type="button" class="add-session-btn" id="editAddSessionBtn" style="margin-top: 8px;">
            <i class="fa-solid fa-plus"></i> เพิ่มรอบการอบรม
          </button>
        </div>

        <div class="form-group" style="margin-top: var(--space-6); display: flex; gap: var(--space-3);">
          <button type="submit" class="btn btn-primary btn-lg" style="flex: 1;" id="saveBtn">
            <i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข
          </button>
          <button type="button" class="btn btn-outline-navy btn-lg modal-cancel-btn" style="flex: 1;">
            ยกเลิก
          </button>
        </div>
      </form>
    `;

    const modal = UI.modal({
      title: `แก้ไขรายละเอียดการอบรม (${training.trainingId})`,
      content,
      size: 'lg'
    });

    // Populate existing sessions
    if (sessions && sessions.length > 0) {
      sessions.forEach(s => this._addSessionRow(s));
    } else {
      this._addSessionRow();
    }

    // Bind capacity type toggle
    const formEl = modal.el.querySelector('#editTrainingForm');
    const capacityRadios = formEl.querySelectorAll('input[name="editCapacityType"]');
    const capacityLimitGroup = formEl.querySelector('#editCapacityLimitGroup');
    const maxSeatsInput = formEl.querySelector('#editMaxSeatsInput');
    
    capacityRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'limited') {
          capacityLimitGroup.classList.remove('hidden');
          maxSeatsInput.required = true;
        } else {
          capacityLimitGroup.classList.add('hidden');
          maxSeatsInput.required = false;
          maxSeatsInput.value = '';
        }
      });
    });

    // Bind events
    formEl.querySelector('#editAddSessionBtn').addEventListener('click', () => this._addSessionRow());
    formEl.querySelector('.modal-cancel-btn').addEventListener('click', () => modal.close());
    formEl.addEventListener('submit', (e) => this._handleSubmit(e, training.trainingId, modal, onSaveSuccess));
  },

  _addSessionRow(sessionData = null) {
    const list = document.getElementById('editSessionList');
    if (!list) return;

    const idx = ++this._sessionCount;
    const row = document.createElement('div');
    row.className = 'session-row animate-fade-in';
    row.id = `edit-session-${idx}`;

    let sessionId = '';
    let startDate = '';
    let endDate = '';
    let startTime = '08:00';
    let endTime = '16:00';

    // Helper function to format date to YYYY-MM-DD with UTC+7 timezone offset adjustment
    const formatInputDate = (dateVal) => {
      if (!dateVal) return '';
      const str = String(dateVal).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      const d = new Date(str);
      if (isNaN(d.getTime())) {
        if (str.includes('T')) return str.split('T')[0];
        return '';
      }
      // Add 7 hours for ICT (UTC+7) timezone shift
      const ictTime = d.getTime() + 7 * 60 * 60 * 1000;
      const ictDate = new Date(ictTime);
      const y = ictDate.getUTCFullYear();
      const m = String(ictDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(ictDate.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Helper function to format time to HH:mm
    const formatInputTime = (timeVal) => {
      if (!timeVal) return '';
      const str = String(timeVal).trim();
      if (/^\d{2}:\d{2}$/.test(str)) {
        return str;
      }
      if (/^\d{2}\.\d{2}$/.test(str)) {
        return str.replace('.', ':');
      }
      if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const isHistorical = str.includes('1899');
          const offset = isHistorical ? 24124000 : 7 * 60 * 60 * 1000;
          const ictTime = d.getTime() + offset;
          const ictDate = new Date(ictTime);
          const hours = String(ictDate.getUTCHours()).padStart(2, '0');
          const mins  = String(ictDate.getUTCMinutes()).padStart(2, '0');
          return `${hours}:${mins}`;
        }
      }
      const parts = str.split(':');
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, '0');
        const mins  = parts[1].padStart(2, '0');
        return `${hours}:${mins}`;
      }
      return '';
    };

    if (sessionData) {
      sessionId = sessionData.sessionId || '';
      const dateVal = sessionData.sessionDate || '';
      if (dateVal.includes('~')) {
        [startDate, endDate] = dateVal.split('~');
      } else {
        startDate = dateVal;
        endDate = dateVal;
      }
      startTime = sessionData.startTime || '08:00';
      endTime = sessionData.endTime || '16:00';
    }

    startDate = formatInputDate(startDate);
    endDate = formatInputDate(endDate);
    startTime = formatInputTime(startTime);
    endTime = formatInputTime(endTime);

    row.innerHTML = `
      <input type="hidden" class="session-id-input" value="${sessionId}">
      <div class="form-group">
        <label class="form-label">วันที่เริ่มต้น <span class="required">*</span></label>
        <input type="date" class="form-control session-start-date" value="${startDate}" required>
      </div>
      <div class="form-group">
        <label class="form-label">วันที่สิ้นสุด <span class="required">*</span></label>
        <input type="date" class="form-control session-end-date" value="${endDate}" required>
      </div>
      <div class="form-group">
        <label class="form-label">เวลาเริ่ม <span class="required">*</span></label>
        <input type="time" class="form-control session-start" value="${startTime}" required>
      </div>
      <div class="form-group">
        <label class="form-label">เวลาสิ้นสุด <span class="required">*</span></label>
        <input type="time" class="form-control session-end" value="${endTime}" required>
      </div>
      <button type="button" class="session-remove-btn" title="ลบรอบนี้" ${idx === 1 && !sessionData ? 'disabled style="opacity:0.3"' : ''}>
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    row.querySelector('.session-remove-btn').addEventListener('click', () => {
      if (document.querySelectorAll('#editSessionList .session-row').length > 1) {
        row.remove();
      } else {
        UI.warning('ต้องมีอย่างน้อย 1 รอบการอบรม');
      }
    });

    list.appendChild(row);
  },

  _collectSessions() {
    const rows = document.querySelectorAll('#editSessionList .session-row');
    const sessions = [];
    let valid = true;

    const capacityType = document.querySelector('input[name="editCapacityType"]:checked')?.value || 'unlimited';
    const maxSeatsVal = capacityType === 'limited' ? Number(document.getElementById('editMaxSeatsInput').value) : 999999;

    if (capacityType === 'limited' && (!maxSeatsVal || maxSeatsVal <= 0)) {
      UI.error('กรุณาระบุจำนวนคนสูงสุดที่ต้องการจำกัด');
      return null;
    }

    rows.forEach((row, i) => {
      const sessionId = row.querySelector('.session-id-input').value;
      const startDate = row.querySelector('.session-start-date').value;
      const endDate   = row.querySelector('.session-end-date').value;
      const start     = row.querySelector('.session-start').value;
      const end       = row.querySelector('.session-end').value;

      if (!startDate || !endDate || !start || !end) { valid = false; return; }
      if (startDate > endDate) {
        UI.error(`รอบที่ ${i + 1}: วันที่สิ้นสุดต้องอยู่หลังหรือวันเดียวกับวันที่เริ่มต้น`);
        valid = false; return;
      }
      if (startDate === endDate && start >= end) {
        UI.error(`รอบที่ ${i + 1}: เวลาสิ้นสุดต้องหลังเวลาเริ่ม`);
        valid = false; return;
      }

      const dateRangeVal = startDate === endDate ? startDate : `${startDate}~${endDate}`;

      const sessionObj = {
        sessionDate: dateRangeVal,
        sessionDateThai: Utils.dateInputToThai(dateRangeVal, 'long'),
        startTime: start,
        endTime: end,
        maxSeats: maxSeatsVal
      };

      if (sessionId) {
        sessionObj.sessionId = sessionId;
      }

      sessions.push(sessionObj);
    });

    return valid ? sessions : null;
  },

  async _handleSubmit(e, trainingId, modal, onSaveSuccess) {
    e.preventDefault();

    const title     = document.getElementById('editTrainingTitle').value.trim();
    const organizer = document.getElementById('editTrainingOrganizer').value.trim();
    const location  = document.getElementById('editTrainingLocation').value.trim();
    const description = document.getElementById('editTrainingDescription')?.value.trim() || '';
    const sessions  = this._collectSessions();

    if (!title || !organizer || !location) {
      UI.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!sessions || sessions.length === 0) {
      UI.error('กรุณาเพิ่มอย่างน้อย 1 รอบการอบรม และตรวจสอบข้อมูลให้ถูกต้อง');
      return;
    }

    // Bug 2: Show loading overlay on Save
    UI.showLoadingOverlay('กำลังบันทึกการแก้ไข...');

    try {
      await API.updateTraining(trainingId, { title, organizer, location, description, sessions });
      
      UI.hideLoadingOverlay();
      UI.success('บันทึกการแก้ไขสำเร็จ!', 'สำเร็จ');
      
      modal.close();

      if (onSaveSuccess) {
        onSaveSuccess();
      }

    } catch (err) {
      UI.hideLoadingOverlay();
      UI.error('ไม่สามารถบันทึกการแก้ไขได้: ' + err.message);
    }
  }
};
