/**
 * create-training.js — Module 1: Training Course Creation
 * สร้างหัวข้ออบรม กำหนดวัน/เวลา หลายรอบ พร้อม QR Code
 */

const CreateTrainingPage = {
  _sessionCount: 1,

  render(container, params) {
    this._sessionCount = 1;
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header">
          <h1 class="page-title">สร้างหัวข้ออบรม</h1>
          <p class="page-subtitle">กรอกข้อมูลหัวข้อการอบรมและกำหนดรอบวันเวลาได้หลายรอบ</p>
        </div>

        <div class="card training-form-card">
          <div class="card-body">
            <form id="createTrainingForm" novalidate>

              <!-- ข้อมูลพื้นฐาน -->
              <div class="form-section">
                <div class="form-section-title"><i class="fa-solid fa-clipboard-list"></i> ข้อมูลการอบรม</div>
                <div class="form-grid">
                  <div class="form-group full-width">
                    <label class="form-label" for="trainingTitle">
                      ชื่อหัวข้อการอบรม <span class="required">*</span>
                    </label>
                    <input type="text" id="trainingTitle" class="form-control"
                      placeholder="เช่น การพยาบาลผู้ป่วยวิกฤต" required maxlength="200">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="trainingOrganizer">
                      หน่วยงานที่จัด <span class="required">*</span>
                    </label>
                    <input type="text" id="trainingOrganizer" class="form-control"
                      placeholder="เช่น งานการพยาบาลผู้ป่วยอายุรกรรม" required maxlength="200">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="trainingLocation">
                      สถานที่จัด <span class="required">*</span>
                    </label>
                    <select id="trainingLocation" class="form-control" required>
                      <option value="">-- กรุณาเลือกสถานที่จัด --</option>
                      <option value="ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน">ห้องประชุมพุทธชาด อาคารผู้ป่วยนอกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                      <option value="ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน">ห้องประชุมอินทนิล อาคารผู้ป่วยนอกชั้น 3 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                      <option value="ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน">ห้องประชุมวิโรจนวัธน์ อาคารแพทย์แผนไทยและการแพทย์ทางเลือกชั้น 4 โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</option>
                    </select>
                  </div>
                </div>
                
                <!-- ตั้งค่าจำนวนคนลงทะเบียน -->
                <div class="form-grid" style="margin-top: var(--space-4);">
                  <div class="form-group">
                    <label class="form-label">จำนวนคนลงทะเบียน <span class="required">*</span></label>
                    <div style="display: flex; gap: var(--space-4); align-items: center; margin-top: var(--space-2); height: 40px;">
                      <label style="display: flex; align-items: center; gap: var(--space-1); cursor: pointer;">
                        <input type="radio" name="capacityType" value="unlimited" checked> ไม่จำกัด
                      </label>
                      <label style="display: flex; align-items: center; gap: var(--space-1); cursor: pointer;">
                        <input type="radio" name="capacityType" value="limited"> จำกัดจำนวนคน
                      </label>
                    </div>
                  </div>
                  <div class="form-group hidden" id="capacityLimitGroup">
                    <label class="form-label" for="maxSeatsInput">
                      จำนวนคนสูงสุด (คน) <span class="required">*</span>
                    </label>
                    <input type="number" id="maxSeatsInput" class="form-control"
                      min="1" placeholder="เช่น 50">
                  </div>
                </div>
              </div>

              <!-- รอบวันเวลา -->
              <div class="form-section">
                <div class="form-section-title"><i class="fa-solid fa-calendar-days"></i> รอบวันและเวลาอบรม</div>
                <div id="sessionList" class="session-list"></div>
                <button type="button" class="add-session-btn" id="addSessionBtn">
                  <i class="fa-solid fa-plus"></i> เพิ่มรอบการอบรม
                </button>
              </div>

              <div class="form-group" style="margin-top: var(--space-6);">
                <button type="submit" class="btn btn-primary btn-lg btn-block" id="createBtn">
                  <i class="fa-solid fa-paper-plane"></i> สร้างหัวข้ออบรม
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Result Panel (hidden initially) -->
        <div id="resultPanel" class="result-panel hidden animate-fade-in">
          <div class="result-panel-title"><i class="fa-solid fa-circle-check text-success"></i> สร้างหัวข้ออบรมสำเร็จ!</div>
          <div class="result-grid">
            <div>
              <div style="margin-bottom: var(--space-4);">
                <div class="code-display">
                  <div>
                    <div class="code-label"><i class="fa-solid fa-id-card"></i> รหัสการอบรม</div>
                    <div class="code-value" id="resultTrainingId">—</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="Utils.copyToClipboard(document.getElementById('resultTrainingId').textContent)"><i class="fa-solid fa-copy"></i> คัดลอก</button>
                </div>
              </div>
              <div>
                <div class="code-display">
                  <div>
                    <div class="code-label"><i class="fa-solid fa-key"></i> รหัสผู้ดูแล (Management Code)</div>
                    <div class="code-value" id="resultMgmtCode">—</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="Utils.copyToClipboard(document.getElementById('resultMgmtCode').textContent)"><i class="fa-solid fa-copy"></i> คัดลอก</button>
                </div>
                <div class="alert alert-warning" style="margin-top: var(--space-3);">
                  <span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
                  <div class="alert-content">
                    <div class="alert-title">โปรดเก็บรหัสนี้ไว้</div>
                    ใช้สำหรับเข้าสู่ระบบบริหารจัดการ ไม่สามารถกู้คืนได้หากสูญหาย
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div class="qr-panel has-qr">
                <div class="qr-label"><i class="fa-solid fa-qrcode"></i> QR Code สำหรับลงทะเบียน</div>
                <div class="qr-canvas-wrapper">
                  <canvas id="resultQR"></canvas>
                </div>
                <div class="qr-url" id="resultUrl">—</div>
                <div style="display:flex; gap: var(--space-2); justify-content:center; margin-top: var(--space-3); flex-wrap: wrap;">
                  <button class="btn btn-outline-navy btn-sm" onclick="CreateTrainingPage._copyUrl()"><i class="fa-solid fa-copy"></i> คัดลอก URL</button>
                  <button class="btn btn-outline-teal btn-sm" onclick="CreateTrainingPage._downloadRawQR()"><i class="fa-solid fa-image"></i> โหลด QR</button>
                  <button class="btn btn-teal btn-sm" onclick="CreateTrainingPage._downloadQRCard()"><i class="fa-solid fa-address-card"></i> โหลดการ์ดสวยงาม</button>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-top: var(--space-5); text-align:center;">
            <button class="btn btn-ghost" onclick="CreateTrainingPage._resetForm()"><i class="fa-solid fa-plus"></i> สร้างหัวข้ออบรมใหม่</button>
            <a href="#/verify" class="btn btn-teal" style="margin-left: var(--space-3);"><i class="fa-solid fa-circle-check"></i> ตรวจสอบรายชื่อ</a>
          </div>
        </div>
      </div>
    `;

    // Add first session row
    this._addSessionRow();

    // Bind capacity type toggle
    const capacityRadios = container.querySelectorAll('input[name="capacityType"]');
    const capacityLimitGroup = container.querySelector('#capacityLimitGroup');
    const maxSeatsInput = container.querySelector('#maxSeatsInput');
    
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
    document.getElementById('addSessionBtn').addEventListener('click', () => this._addSessionRow());
    document.getElementById('createTrainingForm').addEventListener('submit', (e) => this._handleSubmit(e));
  },

  _addSessionRow() {
    const list = document.getElementById('sessionList');
    const idx  = this._sessionCount++;
    const row  = document.createElement('div');
    row.className = 'session-row animate-fade-in';
    row.id = `session-${idx}`;
    row.innerHTML = `
      <div class="form-group">
        <label class="form-label">วันที่เริ่มต้น <span class="required">*</span></label>
        <input type="date" class="form-control session-start-date" required>
      </div>
      <div class="form-group">
        <label class="form-label">วันที่สิ้นสุด <span class="required">*</span></label>
        <input type="date" class="form-control session-end-date" required>
      </div>
      <div class="form-group">
        <label class="form-label">เวลาเริ่ม <span class="required">*</span></label>
        <input type="time" class="form-control session-start" value="08:00" required>
      </div>
      <div class="form-group">
        <label class="form-label">เวลาสิ้นสุด <span class="required">*</span></label>
        <input type="time" class="form-control session-end" value="16:00" required>
      </div>
      <button type="button" class="session-remove-btn" title="ลบรอบนี้" ${idx === 1 ? 'disabled style="opacity:0.3"' : ''}>
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    row.querySelector('.session-remove-btn').addEventListener('click', () => {
      if (document.querySelectorAll('.session-row').length > 1) {
        row.remove();
      } else {
        UI.warning('ต้องมีอย่างน้อย 1 รอบการอบรม');
      }
    });

    list.appendChild(row);
  },

  _collectSessions() {
    const rows = document.querySelectorAll('.session-row');
    const sessions = [];
    let valid = true;

    const capacityType = document.querySelector('input[name="capacityType"]:checked')?.value || 'unlimited';
    const maxSeatsVal = capacityType === 'limited' ? Number(document.getElementById('maxSeatsInput').value) : 999999;

    if (capacityType === 'limited' && (!maxSeatsVal || maxSeatsVal <= 0)) {
      UI.error('กรุณาระบุจำนวนคนสูงสุดที่ต้องการจำกัด');
      return null;
    }

    rows.forEach((row, i) => {
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

      sessions.push({
        sessionDate: dateRangeVal,
        sessionDateThai: Utils.dateInputToThai(dateRangeVal, 'long'),
        startTime: start,
        endTime: end,
        maxSeats: maxSeatsVal
      });
    });

    return valid ? sessions : null;
  },

  async _handleSubmit(e) {
    e.preventDefault();

    const title     = document.getElementById('trainingTitle').value.trim();
    const organizer = document.getElementById('trainingOrganizer').value.trim();
    const location  = document.getElementById('trainingLocation').value.trim();
    const sessions  = this._collectSessions();

    if (!title || !organizer || !location) {
      UI.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (!sessions || sessions.length === 0) {
      UI.error('กรุณาเพิ่มอย่างน้อย 1 รอบการอบรม และตรวจสอบข้อมูลให้ถูกต้อง');
      return;
    }

    const btn = document.getElementById('createBtn');
    UI.setButtonLoading(btn, true, 'กำลังสร้าง...');

    try {
      const result = await API.createTraining({ title, organizer, location, sessions });

      // Show result panel
      document.getElementById('resultTrainingId').textContent = result.trainingId;
      document.getElementById('resultMgmtCode').textContent   = result.managementCode;

      const url = Utils.buildRegisterUrl(result.trainingId);
      document.getElementById('resultUrl').textContent = url;

      // Generate QR
      const canvas = document.getElementById('resultQR');
      Utils.generateQR(canvas, url, 200);

      document.getElementById('resultPanel').classList.remove('hidden');
      document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth' });

      UI.success('สร้างหัวข้ออบรมสำเร็จ!', 'สำเร็จ');

    } catch (err) {
      UI.error('ไม่สามารถสร้างหัวข้ออบรมได้: ' + err.message);
    } finally {
      UI.setButtonLoading(btn, false);
    }
  },

  _copyUrl() {
    const url = document.getElementById('resultUrl').textContent;
    Utils.copyToClipboard(url);
  },

  _downloadRawQR() {
    const url = document.getElementById('resultUrl').textContent;
    const trainingId = document.getElementById('resultTrainingId').textContent;
    Utils.downloadRawQR(url, `QR_Registration_${trainingId}`);
  },

  _downloadQRCard() {
    const url = document.getElementById('resultUrl').textContent;
    const title = document.getElementById('trainingTitle').value.trim();
    const trainingId = document.getElementById('resultTrainingId').textContent;
    Utils.downloadQRCard(title, url, `Card_Registration_${trainingId}`);
  },

  _resetForm() {
    document.getElementById('createTrainingForm').reset();
    document.getElementById('resultPanel').classList.add('hidden');
    document.getElementById('sessionList').innerHTML = '';
    this._sessionCount = 1;
    this._addSessionRow();
    document.getElementById('capacityLimitGroup').classList.add('hidden');
    document.getElementById('maxSeatsInput').required = false;
    window.scrollTo(0, 0);
  },

  cleanup() {
    this._sessionCount = 1;
  }
};
