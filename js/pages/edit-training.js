/**
 * edit-training.js — Module 1.1: Edit Training Course
 * แก้ไขหัวข้ออบรม กำหนดวัน/เวลา และรอบการอบรมใหม่
 */

const EditTrainingPage = {
  _sessionCount: 0,
  _trainingId: null,
  _trainingData: null,

  async render(container, params) {
    const unlockInfo = Utils.storage.get('mgmt_unlock');
    const paramId = params.id;

    // Check if unlocked for this training
    if (!unlockInfo || (paramId && unlockInfo.trainingId !== paramId)) {
      container.innerHTML = `
        <div class="animate-fade-in" style="max-width:500px; margin: 4rem auto; text-align:center;">
          <div class="card" style="padding: var(--space-8);">
            <div style="font-size:3rem; margin-bottom: var(--space-4); color: var(--gray-400);"><i class="fa-solid fa-lock"></i></div>
            <h2 class="card-title" style="margin-bottom: var(--space-2);">ต้องระบุรหัสผู้ดูแล</h2>
            <p style="color: var(--gray-600); margin-bottom: var(--space-6);">กรุณาเข้าสู่ระบบบริหารจัดการก่อนทำการแก้ไขข้อมูลการอบรมนี้</p>
            <a href="#/manage" class="btn btn-primary btn-block">ไปที่ระบบจัดการ</a>
          </div>
        </div>
      `;
      return;
    }

    this._trainingId = paramId;
    this._sessionCount = 0;

    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap: var(--space-4);">
          <div>
            <h1 class="page-title">แก้ไขหัวข้ออบรม</h1>
            <p class="page-subtitle">แก้ไขรายละเอียดหัวข้อการอบรมและรอบวันเวลาอบรม</p>
          </div>
          <div>
            <a href="#/manage" class="btn btn-outline-navy btn-sm"><i class="fa-solid fa-arrow-left"></i> กลับไปหน้าจัดการ</a>
          </div>
        </div>

        <div id="editFormContainer">
          <div class="page-loader">
            <div class="spinner"></div>
            <span>กำลังโหลดข้อมูลการอบรม...</span>
          </div>
        </div>
      </div>
    `;

    await this._loadTrainingData();
  },

  async _loadTrainingData() {
    const formContainer = document.getElementById('editFormContainer');
    if (!formContainer) return;

    try {
      // Load training detail and sessions
      const [training, sessions] = await Promise.all([
        API.getTrainingById(this._trainingId),
        API.getTrainingSessions(this._trainingId)
      ]);

      this._trainingData = training;
      this._trainingData.sessions = sessions || [];

      this._renderForm(formContainer);
    } catch (err) {
      console.error(err);
      UI.showError(formContainer, 'ไม่สามารถโหลดข้อมูลการอบรมได้: ' + err.message, () => this._loadTrainingData());
    }
  },

  _renderForm(container) {
    const t = this._trainingData;
    const firstSession = t.sessions[0] || {};
    const isLimited = firstSession.maxSeats && firstSession.maxSeats < 999999;
    const maxSeatsVal = isLimited ? firstSession.maxSeats : '';

    container.innerHTML = `
      <div class="card training-form-card">
        <div class="card-body">
          <form id="editTrainingForm" novalidate>
            <!-- ข้อมูลพื้นฐาน -->
            <div class="form-section">
              <div class="form-section-title"><i class="fa-solid fa-clipboard-list"></i> ข้อมูลการอบรม</div>
              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label" for="editTrainingTitle">
                    ชื่อหัวข้อการอบรม <span class="required">*</span>
                  </label>
                  <input type="text" id="editTrainingTitle" class="form-control"
                    value="${t.title || ''}" required maxlength="200">
                </div>
                <div class="form-group">
                  <label class="form-label" for="editTrainingOrganizer">
                    หน่วยงานที่จัด <span class="required">*</span>
                  </label>
                  <input type="text" id="editTrainingOrganizer" class="form-control"
                    value="${t.organizer || ''}" required maxlength="200">
                </div>
                <div class="form-group">
                  <label class="form-label" for="editTrainingLocation">
                    สถานที่จัด <span class="required">*</span>
                  </label>
                  <select id="editTrainingLocation" class="form-control" required>
                    <option value="">-- กรุณาเลือกสถานที่จัด --</option>
                    <option value="ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${t.location === 'ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                    <option value="ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${t.location === 'ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                    <option value="ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน" ${t.location === 'ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' ? 'selected' : ''}>ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
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
              <div id="editSessionList" class="session-list"></div>
              <button type="button" class="add-session-btn" id="editAddSessionBtn">
                <i class="fa-solid fa-plus"></i> เพิ่มรอบการอบรม
              </button>
            </div>

            <div class="form-group" style="margin-top: var(--space-6); display: flex; gap: var(--space-3);">
              <button type="submit" class="btn btn-primary btn-lg" style="flex: 1;" id="saveBtn">
                <i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข
              </button>
              <a href="#/manage" class="btn btn-outline-navy btn-lg" style="flex: 1; text-align: center; line-height: 2.5;">
                ยกเลิก
              </a>
            </div>
          </form>
        </div>
      </div>
    `;

    // Populate existing sessions
    if (t.sessions && t.sessions.length > 0) {
      t.sessions.forEach(s => this._addSessionRow(s));
    } else {
      this._addSessionRow();
    }

    // Bind capacity type toggle
    const capacityRadios = container.querySelectorAll('input[name="editCapacityType"]');
    const capacityLimitGroup = container.querySelector('#editCapacityLimitGroup');
    const maxSeatsInput = container.querySelector('#editMaxSeatsInput');
    
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
    document.getElementById('editAddSessionBtn').addEventListener('click', () => this._addSessionRow());
    document.getElementById('editTrainingForm').addEventListener('submit', (e) => this._handleSubmit(e));
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

    // If it's a date object/ISO format from spreadsheet, clean to YYYY-MM-DD
    if (startDate && startDate.includes('T')) startDate = startDate.split('T')[0];
    if (endDate && endDate.includes('T')) endDate = endDate.split('T')[0];

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

  async _handleSubmit(e) {
    e.preventDefault();

    const title     = document.getElementById('editTrainingTitle').value.trim();
    const organizer = document.getElementById('editTrainingOrganizer').value.trim();
    const location  = document.getElementById('editTrainingLocation').value.trim();
    const sessions  = this._collectSessions();

    if (!title || !organizer || !location) {
      UI.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!sessions || sessions.length === 0) {
      UI.error('กรุณาเพิ่มอย่างน้อย 1 รอบการอบรม และตรวจสอบข้อมูลให้ถูกต้อง');
      return;
    }

    const btn = document.getElementById('saveBtn');
    UI.setButtonLoading(btn, true, 'กำลังบันทึก...');

    try {
      await API.updateTraining(this._trainingId, { title, organizer, location, sessions });
      UI.success('บันทึกการแก้ไขสำเร็จ!', 'สำเร็จ');
      
      // Redirect back to manage page
      setTimeout(() => {
        Router.navigate(`/manage`);
      }, 1500);

    } catch (err) {
      UI.error('ไม่สามารถบันทึกการแก้ไขได้: ' + err.message);
    } finally {
      UI.setButtonLoading(btn, false);
    }
  },

  cleanup() {
    this._sessionCount = 0;
    this._trainingId = null;
    this._trainingData = null;
  }
};
