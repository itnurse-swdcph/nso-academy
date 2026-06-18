/**
 * verify.js — Module 3: Registration Verification & Export
 * ตรวจสอบรายชื่อ, Export Excel, Print PDF ใบเซ็นชื่อ
 */

const VerifyPage = {
  _trainings: [],
  _currentTraining: null,
  _currentSession: null,
  _registrations: [],

  async render(container, params) {
    this._registrations = [];
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header">
          <h1 class="page-title">ตรวจสอบรายชื่อผู้เข้าอบรม</h1>
          <p class="page-subtitle">เลือกหัวข้อและรอบการอบรม เพื่อดูรายชื่อและ Export เอกสาร</p>
        </div>

        <!-- Selectors -->
        <div class="card" style="margin-bottom: var(--space-5);">
          <div class="card-body">
            <div class="verify-selectors">
              <div class="form-group">
                <label class="form-label" for="trainingVerifySel">หัวข้ออบรม</label>
                <select id="trainingVerifySel" class="form-control">
                  <option value="">กำลังโหลด...</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sessionVerifySel">รอบการอบรม</label>
                <select id="sessionVerifySel" class="form-control" disabled>
                  <option value="">-- เลือกหัวข้อก่อน --</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Results -->
        <div id="verifyResults"></div>
      </div>
    `;

    await this._loadTrainings(container);

    document.getElementById('trainingVerifySel').addEventListener('change', (e) => {
      this._onTrainingSelect(e.target.value);
    });
    document.getElementById('sessionVerifySel').addEventListener('change', (e) => {
      if (e.target.value) {
        this._loadRegistrations(container);
      } else {
        const resultsEl = document.getElementById('verifyResults');
        if (resultsEl) resultsEl.innerHTML = '';
      }
    });
  },

  async _loadTrainings(container) {
    try {
      this._trainings = await API.getTrainings();
      const sel = document.getElementById('trainingVerifySel');
      sel.innerHTML = `<option value="">-- กรุณาเลือกหัวข้ออบรม --</option>`;
      this._trainings.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.trainingId;
        opt.textContent = t.title;
        sel.appendChild(opt);
      });
    } catch (err) {
      UI.error('ไม่สามารถโหลดรายการอบรม: ' + err.message);
    }
  },

  async _onTrainingSelect(trainingId) {
    const training = this._trainings.find(t => t.trainingId === trainingId);
    this._currentTraining = training || null;
    const sessSel = document.getElementById('sessionVerifySel');
    const resultsEl = document.getElementById('verifyResults');

    if (resultsEl) resultsEl.innerHTML = '';

    if (!training) {
      sessSel.innerHTML = '<option value="">-- เลือกหัวข้อก่อน --</option>';
      sessSel.disabled = true;
      return;
    }

    sessSel.innerHTML = '<option value="">กำลังโหลดรอบการอบรม...</option>';
    sessSel.disabled = true;

    try {
      const sessions = await API.getTrainingSessions(trainingId);
      this._currentTraining.sessions = sessions || [];

      sessSel.innerHTML = '<option value="">-- กรุณาเลือกรอบ --</option>';
      if (sessions && sessions.length > 0) {
        sessions.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.sessionId;
          // Dynamic date range: single day or multi-day range
          const dateLabel = (() => {
            if (Array.isArray(s.sessionDates) && s.sessionDates.length > 1) {
              return Utils.formatDateRange(s.sessionDates[0], s.sessionDates[s.sessionDates.length - 1], 'long');
            }
            return Utils.dateInputToThai(s.sessionDate, 'long');
          })();
          opt.textContent = `${dateLabel} เวลา ${Utils.formatTime(s.startTime)} - ${Utils.formatTime(s.endTime)} น.`;
          sessSel.appendChild(opt);
        });
        sessSel.disabled = false;
      } else {
        sessSel.innerHTML = '<option value="">-- ไม่มีรอบการอบรม --</option>';
      }
    } catch (err) {
      UI.error('ไม่สามารถโหลดรอบการอบรมได้: ' + err.message);
      sessSel.innerHTML = '<option value="">-- โหลดรอบล้มเหลว --</option>';
    }
  },

  async _loadRegistrations(container) {
    const sessionId = document.getElementById('sessionVerifySel').value;
    const session = this._currentTraining?.sessions?.find(s => s.sessionId === sessionId);
    this._currentSession = session || null;

    const resultsEl = document.getElementById('verifyResults');
    UI.showPageLoader(resultsEl);

    try {
      const regs = await API.getRegistrations(sessionId);
      this._registrations = regs || [];

      // Sort by department
      this._registrations.sort((a, b) =>
        (a.department || '').localeCompare(b.department || '', 'th')
      );

      this._renderTable(resultsEl);
    } catch (err) {
      UI.showError(resultsEl, 'ไม่สามารถโหลดรายชื่อได้: ' + err.message, () => this._loadRegistrations(container));
    }
  },

  _renderTableRows(list) {
    if (!list.length) {
      return `<tr><td colspan="5" class="text-center text-muted" style="padding: var(--space-6);">ไม่พบรายชื่อที่ตรงกับคำค้นหา</td></tr>`;
    }
    let rows = '';
    let no = 1;
    let lastDept = null;
    list.forEach(reg => {
      if (reg.department !== lastDept) {
        rows += `
          <tr>
            <td colspan="5" class="dept-separator" style="background:#e8e8e8; font-weight:700; font-size:11pt; padding:6pt 8pt;">หน่วยงาน: ${reg.department || 'ไม่ระบุหน่วยงาน'}</td>
          </tr>`;
        lastDept = reg.department;
      }
      const statusBadge = reg.status === 'APPROVED'
        ? '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> อนุมัติ</span>'
        : reg.status === 'REJECTED'
        ? '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> ไม่อนุมัติ</span>'
        : '<span class="badge badge-gray"><i class="fa-solid fa-clock"></i> รอดำเนินการ</span>';

      rows += `
        <tr>
          <td class="text-center">${no++}</td>
          <td>${reg.fullName || '-'}</td>
          <td>${reg.position || '-'}</td>
          <td>${reg.department || '-'}</td>
          <td class="text-center">${statusBadge}</td>
        </tr>`;
    });
    return rows;
  },

  _renderTable(resultsEl) {
    const regs = this._registrations;
    const training = this._currentTraining;
    const session  = this._currentSession;

    if (!regs.length) {
      UI.showEmpty(resultsEl, {
        icon: '<i class="fa-solid fa-clipboard-list"></i>',
        title: 'ยังไม่มีผู้ลงทะเบียน',
        desc: 'ยังไม่มีผู้ลงทะเบียนสำหรับรอบนี้'
      });
      return;
    }

    resultsEl.innerHTML = `
      <div class="card animate-fade-in">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <div class="card-title"><i class="fa-solid fa-clipboard-list"></i> รายชื่อผู้เข้าอบรม</div>
            <div class="card-subtitle">
              ${training?.title || ''} ·
              ${session ? (() => {
                if (Array.isArray(session.sessionDates) && session.sessionDates.length > 1) {
                  return Utils.formatDateRange(session.sessionDates[0], session.sessionDates[session.sessionDates.length - 1], 'long');
                }
                return Utils.dateInputToThai(session.sessionDate, 'long');
              })() : ''}
              <span class="participants-count" id="participantsCount">· รวม ${regs.length} ท่าน</span>
            </div>
          </div>
          <div class="header-actions" style="gap: var(--space-2);">
            <button class="btn btn-outline-teal btn-sm" id="exportExcelBtn">
              <i class="fa-solid fa-file-excel"></i> Excel
            </button>
            <button class="btn btn-outline-navy btn-sm" id="printPDFBtn">
              <i class="fa-solid fa-print"></i> พิมพ์ใบเซ็นชื่อ
            </button>
          </div>
        </div>
        <div class="card-body" style="padding-bottom: 0;">
          <div class="form-group" style="margin-bottom: var(--space-4);">
            <div class="input-group">
              <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
              <input type="text" id="attendeeSearchInput" class="form-control" placeholder="ค้นหาชื่อผู้ลงทะเบียน, ตำแหน่ง, หรือหน่วยงาน...">
            </div>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="table" id="verifyTable">
            <thead>
              <tr>
                <th style="width:60px; text-align:center;">ที่</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ตำแหน่ง</th>
                <th>หน่วยงาน</th>
                <th style="width:120px; text-align:center;">สถานะ</th>
              </tr>
            </thead>
            <tbody id="verifyTableBody">${this._renderTableRows(regs)}</tbody>
          </table>
        </div>
      </div>
    `;

    // Search filter event
    document.getElementById('attendeeSearchInput').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = regs.filter(reg => 
        (reg.fullName || '').toLowerCase().includes(q) ||
        (reg.position || '').toLowerCase().includes(q) ||
        (reg.department || '').toLowerCase().includes(q)
      );
      document.getElementById('verifyTableBody').innerHTML = this._renderTableRows(filtered);
      document.getElementById('participantsCount').textContent = `· รวม ${filtered.length} ท่าน`;
    });

    // Export Excel
    document.getElementById('exportExcelBtn').addEventListener('click', () => this._exportExcel());
    // Print PDF
    document.getElementById('printPDFBtn').addEventListener('click', () => this._printPDF());
  },

  _exportExcel() {
    if (!this._registrations.length) { UI.warning('ไม่มีข้อมูลสำหรับ Export'); return; }

    const training = this._currentTraining;
    const session  = this._currentSession;
    const sessionDateLabel = (() => {
      if (!session) return '';
      if (Array.isArray(session.sessionDates) && session.sessionDates.length > 1) {
        return Utils.formatDateRange(session.sessionDates[0], session.sessionDates[session.sessionDates.length - 1], 'numeric');
      }
      return Utils.dateInputToThai(session.sessionDate, 'numeric');
    })();
    const filename = `รายชื่อ_${training?.title || 'อบรม'}_${sessionDateLabel}`;

    Utils.exportExcel(this._registrations, filename, {
      sheetName: 'รายชื่อผู้เข้าอบรม',
      headers: [
        { key: 'fullName',   label: 'ชื่อ-นามสกุล' },
        { key: 'position',   label: 'ตำแหน่ง' },
        { key: 'department', label: 'หน่วยงาน' },
        { key: 'status',     label: 'สถานะ' },
        { key: 'registeredAt', label: 'วันที่ลงทะเบียน' }
      ]
    });
  },

  _printPDF() {
    if (!this._registrations.length) { UI.warning('ไม่มีข้อมูลสำหรับพิมพ์'); return; }

    const training = this._currentTraining;
    const session  = this._currentSession;
    const html = Utils.buildAttendanceHTML(
      training || {},
      session || {},
      this._registrations
    );

    Utils.printPDF(html, `ใบเซ็นชื่อ — ${training?.title || 'การอบรม'}`);
  },

  cleanup() {
    this._trainings = [];
    this._currentTraining = null;
    this._currentSession = null;
    this._registrations = [];
  }
};
