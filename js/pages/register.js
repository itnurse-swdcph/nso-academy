/**
 * register.js — Module 2: Online Registration
 * ลงทะเบียนเข้าอบรม ค้นหาชื่อพนักงาน typeahead, กันลงทะเบียนซ้ำ
 */

const RegisterPage = {
  _allParticipants: [],
  _selectedParticipant: null,
  _training: null,
  _debounceSearch: null,

  async render(container, params) {
    this._selectedParticipant = null;
    this._training = null;

    // ตรวจสอบ training ID จาก URL param
    const trainingId = params.id || '';

    container.innerHTML = `
      <div class="register-page-wrapper animate-fade-in">
        <!-- Training Info Banner -->
        <div id="trainingBanner">
          <div class="page-loader"><div class="spinner"></div><span>กำลังโหลดข้อมูลการอบรม...</span></div>
        </div>

        <!-- Registration Form Card -->
        <div class="register-card" id="registerCard" style="display:none;">
          <form id="regForm" novalidate>
            <!-- Step 1: เลือกรอบ -->
            <div class="form-section">
              <div class="form-section-title"><i class="fa-solid fa-calendar-days"></i> เลือกรอบการอบรม</div>
              <div class="form-group">
                <label class="form-label" for="sessionSelect">รอบวันที่อบรม <span class="required">*</span></label>
                <select id="sessionSelect" class="form-control" required>
                  <option value="">-- กรุณาเลือกรอบการอบรม --</option>
                </select>
              </div>
            </div>

            <!-- Step 2: ค้นหาชื่อ -->
            <div class="form-section">
              <div class="form-section-title"><i class="fa-solid fa-user"></i> ข้อมูลผู้เข้าอบรม</div>
              <div class="form-group">
                <label class="form-label" for="nameSearch">
                  ชื่อ-นามสกุล <span class="required">*</span>
                </label>
                <div class="autocomplete-wrapper">
                  <input type="text" id="nameSearch" class="form-control"
                    placeholder="พิมพ์ชื่อเพื่อค้นหา..." autocomplete="off" required>
                  <div id="autocompleteDropdown" class="autocomplete-dropdown"></div>
                </div>
                <div id="nameHint" class="form-hint">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</div>
              </div>

              <!-- Manual entry toggle -->
              <div class="manual-entry-toggle hidden" id="manualToggle">
                <span><i class="fa-solid fa-pencil"></i></span>
                <span>ไม่พบชื่อในระบบ? <strong>คลิกเพื่อกรอกข้อมูลด้วยตนเอง</strong></span>
              </div>

              <div class="form-grid-2" id="positionDeptRow">
                <div class="form-group">
                  <label class="form-label" for="positionInput">ตำแหน่ง <span class="required">*</span></label>
                  <input type="text" id="positionInput" class="form-control" readonly required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="departmentInput">หน่วยงาน <span class="required">*</span></label>
                  <input type="text" id="departmentInput" class="form-control" readonly required>
                </div>
              </div>
            </div>

            <button type="submit" id="submitBtn" class="btn btn-primary btn-lg btn-block">
              <i class="fa-solid fa-check"></i> ยืนยันการลงทะเบียน
            </button>
          </form>
        </div>

        <!-- Error state -->
        <div id="errorState" class="hidden"></div>

        <!-- Success state -->
        <div id="successState" class="hidden success-page">
          <div class="success-icon" style="color: var(--success);"><i class="fa-solid fa-circle-check"></i></div>
          <h2 class="success-title">ลงทะเบียนสำเร็จ!</h2>
          <p class="success-subtitle" id="successMsg"></p>
          <div class="code-display" style="max-width:320px; margin: 0 auto var(--space-6);">
            <div>
              <div class="code-label">รหัสอ้างอิง</div>
              <div class="code-value" id="successRefId">—</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="Utils.copyToClipboard(document.getElementById('successRefId').textContent)"><i class="fa-solid fa-copy"></i></button>
          </div>
          <div style="display:flex; gap: var(--space-3); flex-wrap:wrap; justify-content:center;">
            <button class="btn btn-outline-navy" onclick="RegisterPage._registerAnother()"><i class="fa-solid fa-plus"></i> ลงทะเบียนคนถัดไป</button>
            <a href="#/" class="btn btn-ghost"><i class="fa-solid fa-house"></i> กลับหน้าหลัก</a>
          </div>
        </div>
      </div>
    `;

    this._debounceSearch = Utils.debounce((q) => this._onSearch(q), 300);

    await this._loadPage(trainingId, container);
  },

  async _loadPage(trainingId, container) {
    const banner = container.querySelector('#trainingBanner');
    const card   = container.querySelector('#registerCard');
    const errEl  = container.querySelector('#errorState');

    try {
      // Load participant list and training data (with sessions if trainingId is provided)
      const [participantsData, trainingsData] = await Promise.all([
        API.getParticipants(),
        trainingId 
          ? Promise.all([API.getTrainingById(trainingId), API.getTrainingSessions(trainingId)])
          : API.getTrainings()
      ]);

      this._allParticipants = participantsData || [];

      // Handle training selection
      let training = null;
      if (trainingId) {
        training = trainingsData[0];
        if (training) {
          training.sessions = trainingsData[1] || [];
        }
      } else if (Array.isArray(trainingsData)) {
        // Show training selector dropdown in banner
        this._renderTrainingSelector(banner, trainingsData, container);
        card.style.display = 'block';
        this._initForm(container, null);
        return;
      }

      if (!training) throw new Error('ไม่พบข้อมูลการอบรม');

      // ── กรองเฉพาะรอบที่ยังไม่ผ่านไป (หน้าลงทะเบียนเท่านั้น) ──
      const rawSessions = training.sessions || [];
      const activeSessions = this._filterActiveSessions(rawSessions);

      // ถ้าทุกรอบหมดเวลาแล้ว ให้แสดง error แทนฟอร์ม
      if (rawSessions.length > 0 && activeSessions.length === 0) {
        throw new Error('หัวข้ออบรมนี้ปิดรับสมัครแล้ว (ทุกรอบผ่านไปแล้ว)');
      }

      training.sessions = activeSessions;
      this._training = training;
      this._renderBanner(banner, training);
      this._populateSessions(training.sessions || []);
      card.style.display = 'block';
      this._initForm(container, training);

    } catch (err) {
      banner.innerHTML = '';
      errEl.classList.remove('hidden');
      UI.showError(errEl, 'ไม่สามารถโหลดข้อมูลได้: ' + err.message);
    }
  },

  _renderTrainingSelector(banner, trainings, container) {
    // ── กรองหัวข้อที่มีรอบเปิดรับสมัครอย่างน้อย 1 รอบ (สำหรับหน้าลงทะเบียน) ──
    const activeTrainings = this._filterActiveTrainings(trainings);

    if (!activeTrainings.length) {
      banner.innerHTML = `
        <div class="training-info-banner" style="background: linear-gradient(135deg, var(--teal-700), var(--teal-800));">
          <div style="max-width:400px;">
            <div class="training-info-title">เลือกหัวข้ออบรม</div>
            <div class="alert alert-warning" style="margin-top: var(--space-4);">
              <span class="alert-icon"><i class="fa-solid fa-calendar-xmark"></i></span>
              <div class="alert-content">ไม่มีหัวข้ออบรมที่เปิดรับสมัครในขณะนี้</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    banner.innerHTML = `
      <div class="training-info-banner" style="background: linear-gradient(135deg, var(--teal-700), var(--teal-800));">
        <div style="max-width:400px;">
          <div class="training-info-title">เลือกหัวข้ออบรม</div>
          <div class="form-group" style="margin-top: var(--space-4);">
            <select id="trainingMainSelect" class="form-control">
              <option value="">-- กรุณาเลือกหัวข้ออบรม --</option>
              ${activeTrainings.map(t => `<option value="${t.trainingId}">${t.title}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    `;

    banner.querySelector('#trainingMainSelect').addEventListener('change', async (e) => {
      const id = e.target.value;
      if (!id) return;

      const sel = document.getElementById('sessionSelect');
      if (sel) {
        sel.innerHTML = '<option value="">กำลังโหลดรอบการอบรม...</option>';
      }

      try {
        const [trainingDetails, sessions] = await Promise.all([
          API.getTrainingById(id),
          API.getTrainingSessions(id)
        ]);

        if (trainingDetails) {
          // _populateSessions จะกรองเฉพาะรอบที่ยังไม่ผ่านไปให้อัตโนมัติ
          trainingDetails.sessions = sessions || [];
          this._training = trainingDetails;
          this._renderBanner(banner, trainingDetails);
          this._populateSessions(sessions || []);
        }
      } catch (err) {
        UI.error('ไม่สามารถโหลดข้อมูลรอบการอบรมได้: ' + err.message);
      }
    });
  },

  _renderBanner(banner, training) {
    const sessions = training.sessions || [];
    const firstSession = sessions[0];
    banner.innerHTML = `
      <div class="training-info-banner">
        <div>
          <div class="training-info-title">${training.title}</div>
          <div class="training-info-meta">
            <div class="training-meta-item"><i class="fa-solid fa-building"></i> ${training.organizer || '-'}</div>
            ${firstSession ? `<div class="training-meta-item"><i class="fa-solid fa-calendar-days"></i> ${Utils.dateInputToThai(firstSession.sessionDate, 'long')}</div>` : ''}
            <div class="training-meta-item"><i class="fa-solid fa-location-dot"></i> ${training.location || '-'}</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * คืนค่าเฉพาะรอบที่ "วันจัดอบรม >= วันนี้" (ตัดเวลาออก เปรียบเทียบแค่วันที่)
   * ใช้เฉพาะหน้าลงทะเบียน (RegisterPage) — หน้า Manage/Dashboard ไม่ผ่านฟังก์ชันนี้
   * @param {Array} sessions - รายการรอบการอบรมทั้งหมดจาก API
   * @returns {Array} รายการรอบที่ยังไม่ผ่านไปหรือเป็นวันนี้
   */
  _filterActiveSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    // ใช้ local date (timezone ไทย) แทน toISOString() ที่เป็น UTC
    // เพื่อป้องกัน UTC offset ทำให้วันที่คลาดเคลื่อน (-7 ชั่วโมง)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return sessions.filter(s => {
      const sessionDateStr = (s.sessionDate || s.date || '').slice(0, 10);
      if (!sessionDateStr) return true;
      return sessionDateStr >= todayStr; // ปิดวันถัดจากวันอบรม
    });
  },

  /**
   * คืนค่าเฉพาะหัวข้ออบรมที่มีอย่างน้อย 1 รอบที่ยังไม่หมดอายุ
   * ใช้เฉพาะหน้าลงทะเบียน — หน้า Manage/Dashboard ไม่ผ่านฟังก์ชันนี้
   * @param {Array} trainings - รายการหัวข้ออบรมทั้งหมดจาก API (ต้องมี .sessions หรือ .sessionCount)
   * @returns {Array} รายการหัวข้อที่ยังมีรอบเปิดรับสมัคร
   */
  _filterActiveTrainings(trainings) {
    if (!Array.isArray(trainings)) return [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return trainings.filter(t => {
      const sessions = t.sessions || [];
      if (!sessions.length) return true;
      return sessions.some(s => {
        const d = (s.sessionDate || s.date || '').slice(0, 10);
        return !d || d >= todayStr;
      });
    });
  },

  _populateSessions(sessions) {
    const sel = document.getElementById('sessionSelect');
    if (!sel) return;

    // ── กรองเฉพาะรอบที่ยังไม่ผ่านไป (Frontend filter สำหรับหน้าลงทะเบียน) ──
    const activeSessions = this._filterActiveSessions(sessions);

    sel.innerHTML = '<option value="">-- กรุณาเลือกรอบการอบรม --</option>';

    if (!activeSessions.length) {
      // ไม่มีรอบเปิดรับสมัคร — แสดง option แจ้งเตือน
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.textContent = '— ปิดรับสมัครทุกรอบแล้ว —';
      sel.appendChild(opt);
      return;
    }

    activeSessions.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.sessionId;
      opt.textContent = `${Utils.dateInputToThai(s.sessionDate, 'long')} เวลา ${Utils.formatTime(s.startTime)} - ${Utils.formatTime(s.endTime)} น.`;
      sel.appendChild(opt);
    });
    if (activeSessions.length === 1) {
      sel.value = activeSessions[0].sessionId;
    }
  },

  _initForm(container, training) {
    const nameInput = document.getElementById('nameSearch');
    const dropdown  = document.getElementById('autocompleteDropdown');
    const manualToggle = document.getElementById('manualToggle');

    // Typeahead search
    nameInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        dropdown.classList.remove('show');
        manualToggle.classList.remove('hidden');
        return;
      }
      this._debounceSearch(q);
    });

    nameInput.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.remove('show'), 200);
    });

    // Manual entry toggle
    manualToggle.addEventListener('click', () => {
      this._setManualEntry(true);
    });

    // Form submit
    document.getElementById('regForm').addEventListener('submit', (e) => this._handleSubmit(e));
  },

  _onSearch(query) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;

    const results = this._allParticipants
      .filter(p => Utils.matchesSearch(p.fullName, query) && p.isActive !== false)
      .slice(0, 10);

    if (!results.length) {
      dropdown.innerHTML = `<div class="autocomplete-no-results">ไม่พบ "${query}" ในระบบ</div>`;
      dropdown.classList.add('show');
      document.getElementById('manualToggle')?.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = results.map(p => `
      <div class="autocomplete-item" data-id="${p.participantId}">
        <div class="autocomplete-item-name">${p.fullName}</div>
        <div class="autocomplete-item-meta">${p.position || ''} · ${p.department || ''}</div>
      </div>
    `).join('');

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', () => {
        const id = item.getAttribute('data-id');
        const participant = this._allParticipants.find(p => p.participantId === id);
        if (participant) this._selectParticipant(participant);
      });
    });

    dropdown.classList.add('show');
  },

  _selectParticipant(p) {
    this._selectedParticipant = p;
    document.getElementById('nameSearch').value = p.fullName;
    document.getElementById('autocompleteDropdown').classList.remove('show');
    document.getElementById('positionInput').value   = p.position || '';
    document.getElementById('departmentInput').value = p.department || '';
    document.getElementById('positionInput').readOnly   = true;
    document.getElementById('departmentInput').readOnly = true;
    document.getElementById('manualToggle')?.classList.add('hidden');
    document.getElementById('nameHint').innerHTML = '<i class="fa-solid fa-circle-check"></i> เลือกแล้ว: ' + p.fullName;
    document.getElementById('nameHint').style.color = 'var(--success)';
  },

  _setManualEntry(enable) {
    this._selectedParticipant = null;
    if (enable) {
      document.getElementById('positionInput').readOnly   = false;
      document.getElementById('departmentInput').readOnly = false;
      document.getElementById('positionInput').value   = '';
      document.getElementById('departmentInput').value = '';
      document.getElementById('nameHint').innerHTML = '<i class="fa-solid fa-pencil"></i> กรอกข้อมูลด้วยตนเอง (ไม่พบในฐานข้อมูล)';
      document.getElementById('nameHint').style.color = 'var(--warning)';
      document.getElementById('manualToggle').classList.add('hidden');
      document.getElementById('positionInput').focus();
    }
  },

  async _handleSubmit(e) {
    e.preventDefault();

    const sessionId  = document.getElementById('sessionSelect').value;
    const fullName   = document.getElementById('nameSearch').value.trim();
    const position   = document.getElementById('positionInput').value.trim();
    const department = document.getElementById('departmentInput').value.trim();

    if (!sessionId)  { UI.error('กรุณาเลือกรอบการอบรม'); return; }
    if (!fullName)   { UI.error('กรุณาระบุชื่อ-นามสกุล'); return; }
    if (!position)   { UI.error('กรุณาระบุตำแหน่ง'); return; }
    if (!department) { UI.error('กรุณาระบุหน่วยงาน'); return; }

    const btn = document.getElementById('submitBtn');
    UI.setButtonLoading(btn, true, 'กำลังลงทะเบียน...');

    try {
      const result = await API.register({
        sessionId,
        trainingId: this._training?.trainingId || '',
        participantId: this._selectedParticipant?.participantId || 'MANUAL',
        fullName,
        position,
        department
      });

      // Show success
      document.getElementById('regForm').classList.add('hidden');
      document.getElementById('successRefId').textContent = result.regId;
      document.getElementById('successMsg').textContent =
        `${fullName} ได้ลงทะเบียนเรียบร้อยแล้ว`;
      document.getElementById('successState').classList.remove('hidden');

    } catch (err) {
      UI.error(err.message);
    } finally {
      UI.setButtonLoading(btn, false);
    }
  },

  _registerAnother() {
    document.getElementById('regForm').classList.remove('hidden');
    document.getElementById('successState').classList.add('hidden');
    document.getElementById('nameSearch').value = '';
    document.getElementById('positionInput').value = '';
    document.getElementById('departmentInput').value = '';
    document.getElementById('nameHint').textContent = 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา';
    document.getElementById('nameHint').style.color = '';
    this._selectedParticipant = null;
  },

  cleanup() {
    this._allParticipants = [];
    this._selectedParticipant = null;
    this._training = null;
  }
};
