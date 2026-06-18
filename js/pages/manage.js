/**
 * manage.js — Module 4: Management Hub
 * ส่วนขยายฟังก์ชัน: ตรวจสอบรายชื่อสำหรับแอดมิน (เวอร์ชันแก้ไข Bug ข้อมูลไม่แสดง และปรับปรุง Filter Logic)
 */

const ManagePage = {
  _unlockedTrainingId: null,
  _unlockedCode: null,

  async render(container, params) {
    const cached = Utils.storage.get('mgmt_unlock');
    if (cached && cached.trainingId && cached.code) {
      this._unlockedTrainingId = cached.trainingId;
      this._unlockedCode = cached.code;
      await this._renderManagementHub(container, cached.trainingId);
      return;
    }

    this._renderGate(container);
  },

 _renderGate(container) {
    const isAdmin = Utils.storage.get('admin_logged_in') === true;
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="management-gate">
          <div class="management-gate-icon"><i class="fa-solid fa-lock"></i></div>
          <h2 class="management-gate-title">ระบบบริหารจัดการ</h2>
          <p class="management-gate-desc">กรุณาเลือกหัวข้ออบรมและใส่รหัสผู้ดูแล เพื่อเข้าสู่ระบบ</p>

          <div class="form-group" style="margin-bottom: var(--space-4); text-align:left;">
            <label class="form-label" for="mgmtTrainingSel">เลือกหัวข้ออบรม</label>
            <select id="mgmtTrainingSel" class="form-control">
              <option value="">กำลังโหลด...</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: var(--space-4); text-align:left;">
            <label class="form-label" for="mgmtCodeInput">รหัสผู้ดูแล (Management Code)</label>
            <div class="code-input-wrapper">
              <input type="text" id="mgmtCodeInput" class="code-input form-control"
                placeholder="${isAdmin ? 'สิทธิ์แอดมินผ่านตลอด' : 'เช่น A4BC8X'}" maxlength="12" style="text-transform:uppercase; letter-spacing:0.2em; font-size: var(--text-xl); text-align:center;" ${isAdmin ? 'disabled value="ADMIN BYPASS"' : ''}>
            </div>
          </div>

          <button class="btn btn-primary btn-lg btn-block" id="unlockBtn">
            <i class="fa-solid fa-lock-open"></i> เข้าสู่ระบบ ${isAdmin ? '(สิทธิ์แอดมิน)' : ''}
          </button>
          
          <button class="btn btn-outline-navy btn-block" id="adminLoginBtn" style="margin-top: var(--space-2);">
            <i class="fa-solid fa-user-shield"></i> ${isAdmin ? 'ออกจากระบบแอดมิน' : 'เข้าสู่ระบบสำหรับแอดมิน'}
          </button>

          <div id="unlockError" class="alert alert-danger hidden" style="margin-top: var(--space-4);">
            <span class="alert-icon"><i class="fa-solid fa-circle-xmark"></i></span>
            <div class="alert-content">รหัสไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง</div>
          </div>
        </div>
      </div>
    `;

    this._loadTrainings();
    
    if (!isAdmin) {
      document.getElementById('mgmtCodeInput').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
      document.getElementById('mgmtCodeInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleUnlock(container);
      });
    }
    
    document.getElementById('unlockBtn').addEventListener('click', () => this._handleUnlock(container));
    
    document.getElementById('adminLoginBtn').addEventListener('click', async () => {
      if (isAdmin) {
        const confirmed = await UI.confirm('ต้องการออกจากระบบแอดมินหรือไม่?', 'ออกจากระบบ');
        if (!confirmed) return;
        
        UI.showLoadingOverlay('กำลังออกจากระบบ...');
        
        // เคลียร์สถานะแอดมินและ Token
        Utils.storage.remove('admin_logged_in');
        Utils.storage.remove('token');
        
        UI.success('ออกจากระบบแอดมินแล้ว');
        UI.hideLoadingOverlay();
        
        // โหลดหน้าฟอร์มใหม่เพื่อปรับสถานะ UI เป็นผู้ใช้ปกติ
        this._renderGate(container);
      } else {
        UI.showLoadingOverlay('กำลังเข้าสู่ระบบ...');
        UI.promptAdminLogin((password) => password === '11450')
          .then((success) => {
            UI.hideLoadingOverlay();
            if (success) {
              Utils.storage.set('admin_logged_in', true);
              UI.success('เข้าสู่ระบบแอดมินสำเร็จ');
              this._renderGate(container);
            }
          });
      }
    });
  },

  async _loadTrainings() {
    try {
      // ⚠️ หน้า Manage แสดงหัวข้ออบรมทั้งหมด — ไม่กรองตามวันที่
      // เจ้าหน้าที่ต้องเห็นข้อมูลที่ผ่านไปแล้วเพื่อจัดการ/อนุมัติ/วิเคราะห์ได้ตามปกติ
      const trainings = await API.getTrainings();
      const sel = document.getElementById('mgmtTrainingSel');
      if (!sel) return;
      sel.innerHTML = '<option value="">-- กรุณาเลือกหัวข้ออบรม --</option>';
      trainings.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.trainingId;
        opt.textContent = t.title;
        sel.appendChild(opt);
      });
    } catch (err) {
      UI.error('ไม่สามารถโหลดรายการอบรม');
    }
  },

  async _handleUnlock(container) {
    const trainingId = document.getElementById('mgmtTrainingSel').value;
    const code = document.getElementById('mgmtCodeInput').value.trim();
    const errEl = document.getElementById('unlockError');

    if (!trainingId) { UI.warning('กรุณาเลือกหัวข้ออบรม'); return; }

    const isAdmin = Utils.storage.get('admin_logged_in') === true;
    if (isAdmin) {
      Utils.storage.set('mgmt_unlock', { trainingId, code: 'ADMIN' });
      this._unlockedTrainingId = trainingId;
      this._unlockedCode = 'ADMIN';
      await this._renderManagementHub(container, trainingId);
      return;
    }

    if (!code) { UI.warning('กรุณาใส่รหัสผู้ดูแล'); return; }

    const btn = document.getElementById('unlockBtn');
    UI.setButtonLoading(btn, true, 'กำลังตรวจสอบ...');
    UI.showLoadingOverlay('กำลังเข้าสู่ระบบ...');
    errEl.classList.add('hidden');

    try {
      await API.validateCode(trainingId, code);
      Utils.storage.set('mgmt_unlock', { trainingId, code });
      this._unlockedTrainingId = trainingId;
      this._unlockedCode = code;
      await this._renderManagementHub(container, trainingId);
    } catch (err) {
      errEl.classList.remove('hidden');
    } finally {
      UI.setButtonLoading(btn, false);
      UI.hideLoadingOverlay();
    }
  },

  async _renderManagementHub(container, trainingId) {
    let title = 'ระบบบริหารจัดการ';
    try {
      const tDetail = await API.getTrainingById(trainingId);
      if (tDetail) title = tDetail.title;
    } catch (e) {
      console.warn('[Manage] Failed to load training details:', e);
    }

    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap: var(--space-4);">
          <div>
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">รหัสการอบรม: <strong>${trainingId}</strong></p>
          </div>
          <div style="display:flex; gap: var(--space-2);">
            <button class="btn btn-outline-teal btn-sm" id="mgmtQRBtn"><i class="fa-solid fa-qrcode"></i> QR Code ลงทะเบียน</button>
          </div>
        </div>

        <div class="management-nav-grid">
          <a href="#" class="management-nav-card" id="mgmtEditBtn">
            <div class="nav-card-icon"><i class="fa-solid fa-pen-to-square"></i></div>
            <div class="nav-card-title">แก้ไขหัวข้ออบรม</div>
            <div class="nav-card-desc">แก้ไขชื่อหัวข้อ สถานที่จัด และรอบการอบรม</div>
          </a>
          <a href="#/pretest?id=${trainingId}" class="management-nav-card">
            <div class="nav-card-icon"><i class="fa-solid fa-file-circle-question"></i></div>
            <div class="nav-card-title">Pre-test</div>
            <div class="nav-card-desc">สร้างข้อสอบก่อนอบรม พร้อม QR Code</div>
          </a>
          <a href="#/posttest?id=${trainingId}" class="management-nav-card">
            <div class="nav-card-icon"><i class="fa-solid fa-file-lines"></i></div>
            <div class="nav-card-title">Post-test</div>
            <div class="nav-card-desc">สร้างข้อสอบหลังอบรม หรือใช้ Pre-test เดิม</div>
          </a>
          <a href="#/satisfaction?id=${trainingId}" class="management-nav-card">
            <div class="nav-card-icon"><i class="fa-solid fa-star"></i></div>
            <div class="nav-card-title">แบบประเมินความพึงพอใจ</div>
            <div class="nav-card-desc">สร้างและจัดการแบบประเมิน</div>
          </a>
          <a href="#/dashboard?id=${trainingId}" class="management-nav-card">
            <div class="nav-card-icon"><i class="fa-solid fa-chart-column"></i></div>
            <div class="nav-card-title">อนุมัติ & วิเคราะห์</div>
            <div class="nav-card-desc">อนุมัติผู้เข้าอบรม วิเคราะห์ผลการเรียนรู้</div>
          </a>
          <a href="#" class="management-nav-card" id="mgmtAdminVerifyBtn" style="border-color: var(--teal-500); background-color: var(--teal-50);">
            <div class="nav-card-icon" style="color: var(--teal-600);"><i class="fa-solid fa-users-gear"></i></div>
            <div class="nav-card-title">ตรวจสอบรายชื่อ (Admin)</div>
            <div class="nav-card-desc">สรุปยอดผู้เข้าอบรม แยกกลุ่มตำแหน่ง และพิมพ์ใบเซ็นชื่อ</div>
          </a>
        </div>
      </div>
    `;

    document.getElementById('mgmtEditBtn').addEventListener('click', (e) => {
      e.preventDefault();
      EditTrainingPage.open(trainingId, () => this._renderManagementHub(container, trainingId));
    });

    document.getElementById('mgmtAdminVerifyBtn').addEventListener('click', (e) => {
      e.preventDefault();
      this._renderAdminVerification(container, trainingId, title);
    });

    document.getElementById('mgmtQRBtn').addEventListener('click', () => {
      this._showQRModal(trainingId, title);
    });
  },

  // ===================================================
  // ฟังก์ชันย่อย: ตรวจสอบรายชื่อแอดมิน 
  // ===================================================
  async _renderAdminVerification(container, trainingId, title) {
    if (!trainingId) {
      UI.error('เกิดข้อผิดพลาด: ไม่พบรหัสหัวข้ออบรม (trainingId is missing)');
      return;
    }

    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-5);">
          <div>
            <h1 class="page-title">ตรวจสอบรายชื่อผู้ลงทะเบียน</h1>
            <p class="page-subtitle">${title}</p>
          </div>
          <button class="btn btn-outline-navy btn-sm" id="backToHubBtn"><i class="fa-solid fa-arrow-left"></i> กลับหน้าระบบจัดการ</button>
        </div>
        <div id="adminVerifyContent" style="text-align:center; padding: var(--space-8);">
          <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--navy-500);"></i>
          <p id="loadingStatusText" style="margin-top: var(--space-3); color: var(--gray-600);">กำลังเชื่อมต่อเซิร์ฟเวอร์...</p>
          <p style="margin-top: var(--space-1); color: var(--gray-400); font-size: var(--text-xs);">การโหลดครั้งแรกอาจใช้เวลาสักครู่ กรุณารอสักประเดี๋ยว</p>
        </div>
      </div>
    `;

    document.getElementById('backToHubBtn').addEventListener('click', () => {
      this._renderManagementHub(container, trainingId);
    });

    // ฟังก์ชันอัปเดตสถานะการโหลด
    const updateLoadingStatus = (text) => {
      const el = document.getElementById('loadingStatusText');
      if (el) el.textContent = text;
    };

    UI.showLoadingOverlay('กำลังเชื่อมต่อเซิร์ฟเวอร์...');
    try {
      // โหลดข้อมูลแบบ Sequential เพื่อลดภาระ GAS backend (ซึ่งเป็น single-threaded)
      // ขั้นตอน 1: โหลดข้อมูลรอบการอบรม และข้อมูลหัวข้ออบรม (เบา)
      updateLoadingStatus('กำลังโหลดข้อมูลรอบการอบรม...');
      UI.showLoadingOverlay('กำลังโหลดข้อมูลรอบการอบรม...');
      const [sessionsData, tDetail] = await Promise.all([
        API.getTrainingSessions(trainingId).catch(() => []),
        API.getTrainingById(trainingId).catch(() => null)
      ]);

      // ขั้นตอน 2: โหลดข้อมูลการลงทะเบียน (หนัก — ใช้เวลานาน)
      updateLoadingStatus('กำลังดึงข้อมูลรายชื่อผู้ลงทะเบียน...');
      UI.showLoadingOverlay('กำลังดึงข้อมูลรายชื่อผู้ลงทะเบียน...');
      const allRegistrations = await API.getRegistrationsByTraining(trainingId);
      
      updateLoadingStatus('กำลังจำแนกและจัดกลุ่มข้อมูล...');
      UI.showLoadingOverlay('กำลังจำแนกและจัดกลุ่มข้อมูล...');
      
      const printTrainingObj = tDetail || { title: title, location: 'โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน' };
      const currentTrainingIdStr = String(trainingId).trim();
      
      const participants = (allRegistrations || []).filter(p => {
        if (!p) return false;
        const rowTrainingId = p.trainingId || p.TrainingId || ''; 
        return String(rowTrainingId).trim() === currentTrainingIdStr;
      });

      UI.hideLoadingOverlay();
      
      if (!participants || participants.length === 0) {
        document.getElementById('adminVerifyContent').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-users-slash"></i></div>
            <h3>ยังไม่มีผู้ลงทะเบียน</h3>
            <p>ไม่พบข้อมูลการลงทะเบียนในระบบสำหรับหลักสูตร <strong>${title}</strong></p>
          </div>`;
        return;
      }

      const positionStats = { 'พยาบาลวิชาชีพ': 0, 'เจ้าพนักงานสาธารณสุข': 0, 'นักวิชาการสาธารณสุข': 0, 'เจ้าพนักงานฉุกเฉินการแพทย์': 0, 'พนักงานช่วยเหลือคนไข้': 0, 'พนักงานประจำตึก': 0, 'พนักงานเปล': 0, 'ตำแหน่งอื่นๆ': 0 };
      const sessionGroups = {};

      participants.forEach(p => {
        const posGroup = this._categorizePosition(p.position || '');
        positionStats[posGroup] += 1;

        const sId = p.sessionId ? String(p.sessionId).trim() : 'รอบทั่วไป';
        if (!sessionGroups[sId]) {
          sessionGroups[sId] = [];
        }
        sessionGroups[sId].push(p);
      });

      const totalParticipants = participants.length;
      let statsHtml = `
        <div style="margin-bottom: var(--space-6);">
          <div style="display:flex; gap: var(--space-4); flex-wrap: wrap;">
            <div class="stat-card" style="flex: 1; min-width: 200px; background: var(--white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--gray-200); text-align: center; box-shadow: var(--shadow-sm);">
              <div style="color: var(--gray-500); font-size: var(--text-sm); margin-bottom: var(--space-1);">ผู้ลงทะเบียนทั้งหมด</div>
              <div style="font-size: 2.2rem; font-weight: var(--fw-bold); color: var(--navy-700);">${totalParticipants}</div>
              <div style="font-size: var(--text-xs); color: var(--gray-400);">คน</div>
            </div>
            <div class="stat-card" style="flex: 3; min-width: 300px; background: var(--white); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
              <div style="color: var(--gray-500); font-size: var(--text-sm); margin-bottom: var(--space-3); border-bottom: 1px solid var(--gray-100); padding-bottom: var(--space-2);">สัดส่วนตำแหน่งผู้เข้าอบรม</div>
              <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
      `;
      
      Object.entries(positionStats).forEach(([key, count]) => {
        if (count > 0) {
          statsHtml += `
            <div style="background: var(--gray-50); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); border: 1px solid var(--gray-200); display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--gray-600);">${key}</span>
              <strong style="color: var(--teal-600); background: rgba(20, 184, 166, 0.1); padding: 2px 8px; border-radius: 12px;">${count}</strong>
            </div>
          `;
        }
      });
      statsHtml += `</div></div></div></div>`;

      let tablesHtml = `<div>`;
      Object.entries(sessionGroups).forEach(([sId, list]) => {
        const textSessionThai = this._formatSessionThai(sId, list, sessionsData);
        tablesHtml += `
          <div class="card" style="margin-bottom: var(--space-6); border-top: 4px solid var(--navy-600); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <div class="card-body" style="padding: var(--space-4_5);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-4); flex-wrap:wrap; gap: var(--space-3);">
                <h4 style="color: var(--navy-800); margin: 0; font-weight: var(--fw-bold); font-size: 1.1rem; display: flex; align-items: center; gap: var(--space-2);">
                  <i class="fa-solid fa-calendar-check" style="color: var(--teal-500);"></i> 
                  <span>${textSessionThai}</span>
                  <span style="font-size: var(--text-xs); font-weight: normal; color: var(--navy-700); background: rgba(20, 184, 166, 0.1); padding: 2px 10px; border-radius: var(--radius-full); margin-left: var(--space-1); border: 1px solid rgba(20, 184, 166, 0.2);">
                    ${list.length} คน
                  </span>
                </h4>
                <button class="btn btn-teal btn-sm print-sheet-btn" data-session="${sId}" style="display:flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-print"></i> พิมพ์ใบเซ็นชื่อรอบนี้
                </button>
              </div>
              
              <div style="overflow-x: auto; border-radius: var(--radius-lg); border: 1px solid var(--gray-200);">
                <table class="table" style="width: 100%; min-width: 600px; border-collapse: collapse; margin: 0;">
                  <thead style="background: linear-gradient(180deg, var(--navy-700) 0%, var(--navy-800) 100%); color: var(--white); border-bottom: 3px solid var(--teal-500);">
                    <tr>
                      <th style="padding: var(--space-3_5) var(--space-2); text-align: center; width: 80px; color: var(--white); font-size: 0.925rem; font-weight: 600; letter-spacing: 0.5px;">ลำดับ</th>
                      <th style="padding: var(--space-3_5) var(--space-3); text-align: left; color: var(--white); font-size: 0.925rem; font-weight: 600; letter-spacing: 0.5px;">ชื่อ-นามสกุล</th>
                      <th style="padding: var(--space-3_5) var(--space-3); text-align: left; color: var(--white); font-size: 0.925rem; font-weight: 600; letter-spacing: 0.5px;">ตำแหน่ง</th>
                      <th style="padding: var(--space-3_5) var(--space-3); text-align: left; color: var(--white); font-size: 0.925rem; font-weight: 600; letter-spacing: 0.5px;">หน่วยงาน/สังกัด</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map((p, i) => `
                      <tr style="border-bottom: 1px solid var(--gray-200); background: ${i % 2 === 0 ? 'var(--white)' : 'var(--gray-50)'}; text-align: left;">
                        <td style="padding: var(--space-3) var(--space-2); text-align: center; color: var(--gray-400); font-size: var(--text-sm);">${i + 1}</td>
                        <td style="padding: var(--space-3) var(--space-3); font-weight: var(--fw-medium); color: var(--navy-900); font-size: var(--text-sm);">${p.fullName || '-'}</td>
                        <td style="padding: var(--space-3) var(--space-3); color: var(--gray-700); font-size: var(--text-sm);">${p.position || '-'}</td>
                        <td style="padding: var(--space-3) var(--space-3); color: var(--gray-700); font-size: var(--text-sm);">${p.department || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      });
      tablesHtml += `</div>`;

      const contentDiv = document.getElementById('adminVerifyContent');
      contentDiv.innerHTML = statsHtml + tablesHtml;
      contentDiv.style.padding = '0';
      contentDiv.style.textAlign = 'left';

      // เรียกเปิดหน้า Print โดยส่ง Object ข้อมูลอบรมและรอบไปด้วย
      document.querySelectorAll('.print-sheet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const currentBtn = e.target.closest('.print-sheet-btn');
          const sessionKey = currentBtn.dataset.session;
          const realSession = sessionsData.find(s => 
            String(s.sessionId).trim() === String(sessionKey).trim() || 
            String(s.id).trim() === String(sessionKey).trim()
          );
          this._printSignInSheet(printTrainingObj, realSession || { id: sessionKey }, sessionGroups[sessionKey]);
        });
      });

    } catch (err) {
      console.error('[Admin Verify] Load failed:', err);
      UI.hideLoadingOverlay();
      const isTimeout = err.message.includes('หมดเวลา') || err.message.includes('AbortError');
      const contentDiv = document.getElementById('adminVerifyContent');
      if (contentDiv) {
        contentDiv.innerHTML = `
          <div style="text-align: center; padding: var(--space-6);">
            <div style="background: var(--white); border: 1px solid ${isTimeout ? 'var(--yellow-300)' : 'var(--red-300)'}; border-radius: var(--radius-lg); padding: var(--space-6); max-width: 500px; margin: 0 auto; box-shadow: var(--shadow-sm);">
              <i class="fa-solid ${isTimeout ? 'fa-clock-rotate-left' : 'fa-circle-exclamation'}" style="font-size: 2.5rem; color: ${isTimeout ? 'var(--yellow-500)' : 'var(--red-500)'}; margin-bottom: var(--space-3);"></i>
              <h3 style="color: var(--navy-800); margin: 0 0 var(--space-2) 0;">${isTimeout ? 'เซิร์ฟเวอร์ตอบช้า' : 'ไม่สามารถโหลดข้อมูลได้'}</h3>
              <p style="color: var(--gray-600); font-size: var(--text-sm); margin-bottom: var(--space-4);">
                ${isTimeout 
                  ? 'เซิร์ฟเวอร์ Google Apps Script ใช้เวลาตอบสนองนานเกินไป (อาจเกิดจากข้อมูลเยอะ หรือเซิร์ฟเวอร์กำลังเริ่มต้นระบบ)' 
                  : err.message}
              </p>
              <div style="display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" id="retryLoadBtn">
                  <i class="fa-solid fa-rotate-right"></i> ลองโหลดใหม่
                </button>
                <button class="btn btn-outline-navy btn-sm" id="backToHubBtn2">
                  <i class="fa-solid fa-arrow-left"></i> กลับหน้าระบบจัดการ
                </button>
              </div>
              ${isTimeout ? '<p style="color: var(--gray-400); font-size: var(--text-xs); margin-top: var(--space-3);">💡 ลองกดโหลดใหม่อีกครั้ง มักจะสำเร็จในครั้งที่ 2 เพราะเซิร์ฟเวอร์ warm แล้ว</p>' : ''}
            </div>
          </div>`;
        document.getElementById('retryLoadBtn').addEventListener('click', () => {
          this._renderAdminVerification(container, trainingId, title);
        });
        document.getElementById('backToHubBtn2').addEventListener('click', () => {
          this._renderManagementHub(container, trainingId);
        });
      }
    }
  },

  // ===================================================
  // ฟังก์ชันย่อย: แปลงรหัส Session ID เป็นวันที่และเวลาไทย (ตัวเต็ม)
  // ===================================================
  _formatSessionThai(sId, list, sessionsData = []) {
    if (!sId || sId === 'รอบทั่วไป') return 'รอบทั่วไป';
    
    // 1. ค้นหาข้อมูล Session ที่ถูกต้องจากฐานข้อมูลกลาง (อ้างอิงจาก ID)
    const realSession = sessionsData.find(s => 
      String(s.sessionId).trim() === String(sId).trim() || 
      String(s.id).trim() === String(sId).trim()
    );
    
    // ฟังก์ชันช่วยแปลงวันที่ให้เป็นภาษาไทยแบบเต็มรูป (รองรับ range ด้วย ~)
    const toThaiDateFull = (dateStr) => {
      if (!dateStr) return '';
      const raw = String(dateStr);
      // ถ้าเป็น date range (เช่น 2026-06-29~2026-07-01) ให้ใช้ Utils.formatDateRange
      if (raw.includes('~')) {
        return Utils.formatDateRange(raw.split('~')[0], raw.split('~')[1], 'long');
      }
      let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/); // รูปแบบ YYYY-MM-DD
      let year, month, day;
      if (match) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // รูปแบบ DD/MM/YYYY
        if (match) {
          day = parseInt(match[1]);
          month = parseInt(match[2]);
          year = parseInt(match[3]);
        }
      }

      if (day && month && year) {
        const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const thYear = year < 2400 ? year + 543 : year;
        return `${day} ${thaiMonths[month - 1]} ${thYear}`;
      }
      return dateStr;
    };

    // 🛑 ฟังก์ชันช่วยเคลียร์ปัญหาเวลา ISO ดิบ (1899-12-30T01:17:56.000Z)
    const formatTimeFromIso = (timeStr) => {
      if (!timeStr) return '';
      const str = String(timeStr).trim();
      
      // ตรวจสอบว่าเป็น ISO String ที่มาจาก Google Sheets
      if (str.includes('T') && str.includes('Z')) {
        const match = str.match(/T(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          let h = parseInt(match[1], 10);
          let m = parseInt(match[2], 10);
          let s = parseInt(match[3], 10);
          
          // แปลงกลับเป็นเวลาไทย (+7 ชั่วโมง)
          h = (h + 7) % 24;
          
          // แก้อาการเหลื่อม 17 นาที 56 วินาที ของ Timezone ยุค 1899 ใน Google Sheets
          if (str.startsWith('1899-12-30')) {
            m -= 17;
            s -= 56;
            if (s < 0) { s += 60; m -= 1; }
            if (m < 0) { m += 60; h -= 1; }
            if (h < 0) { h += 24; }
            
            // ปัดเศษนาทีให้สวยงาม (เผื่อกรณีเวลา 08:30 มันก็จะปัดเข้าหา 30 ให้เป๊ะ)
            m = Math.round(m / 5) * 5;
            if (m === 60) { m = 0; h = (h + 1) % 24; }
          }
          
          const hh = String(h).padStart(2, '0');
          const mm = String(m).padStart(2, '0');
          return `${hh}:${mm}`; // หากต้องการจุด ให้เปลี่ยนเป็น `${hh}.${mm}`
        }
      }
      
      // ถ้าข้อมูลเป็น String ธรรมดาอยู่แล้ว (เช่น "08:00") คืนค่ากลับไปได้เลย
      return str;
    };

    if (realSession) {
       let formattedLabel = '';
       
       const dateVal = realSession.date || realSession.sessionDate;
       if (dateVal) {
           const thaiDateStr = toThaiDateFull(dateVal);
           formattedLabel = `รอบวันที่ ${thaiDateStr}`;
       } else {
           formattedLabel = `รอบที่ (ID: ${sId})`;
       }

       // นำตัวแปร startTime และ endTime ไปเข้าฟังก์ชันแปลงเวลา
       const sTime = formatTimeFromIso(realSession.startTime);
       const eTime = formatTimeFromIso(realSession.endTime);
       
       if (sTime && eTime) {
           formattedLabel += ` เวลา ${sTime} - ${eTime} น.`;
       } else if (realSession.time) {
           formattedLabel += ` เวลา ${formatTimeFromIso(realSession.time)} น.`;
       }
       
       return formattedLabel;
    }

    // 2. หากไม่พบในฐานข้อมูลส่วนกลาง ให้ใช้ข้อมูลบรรทัดแรกเป็น Fallback
    const firstRow = list && list[0];
    if (firstRow) {
      if (firstRow.sessionName && isNaN(firstRow.sessionName) && String(firstRow.sessionName).includes('รอบ')) {
        return firstRow.sessionName;
      }
      if (firstRow.sessionDate) {
        const thaiDateFallback = toThaiDateFull(firstRow.sessionDate);
        let label = `รอบวันที่ ${thaiDateFallback}`;
        if (firstRow.sessionTime) {
          label += ` เวลา ${formatTimeFromIso(firstRow.sessionTime)} น.`;
        }
        return label;
      }
    }

    // 3. Fallback สุดท้าย ปฏิบัติการ Parse จากรูปแบบรหัสมาตรฐาน (SES-YYYYMMDD)
    const regex = /SES-(\d{4})(\d{2})(\d{2})/i;
    const match = String(sId).match(regex);
    
    if (match) {
      const yearEN = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      const yearTH = yearEN + 543;
      
      const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const monthText = thaiMonths[month - 1] || '';
      let formattedLabel = `รอบวันที่ ${day} ${monthText} ${yearTH}`;
      
      if (firstRow && (firstRow.sessionTime || firstRow.time)) {
        const timeVal = formatTimeFromIso(firstRow.sessionTime || firstRow.time);
        formattedLabel += ` เวลา ${timeVal}`;
        if (!String(timeVal).endsWith('น.')) formattedLabel += ' น.';
      } else {
        formattedLabel += ` (ตามกำหนดการหลักสูตร)`;
      }
      
      return formattedLabel;
    }
    
    return `รอบการอบรม (รหัส: ${sId})`;
  },
  
  _categorizePosition(position) {
    const pos = position.trim();
    if (!pos) return 'ตำแหน่งอื่นๆ';

    if (pos.includes('พยาบาลวิชาชีพ') || pos.includes('นักวิชาการสาธารณสุข (พยาบาล)')) {
      return 'พยาบาลวิชาชีพ';
    } else if (pos.includes('เจ้าพนักงานสาธารณสุข')) {
      return 'เจ้าพนักงานสาธารณสุข';
    } else if (pos.includes('นักวิชาการสาธารณสุข')) {
      return 'นักวิชาการสาธารณสุข';
    } else if (pos.includes('เจ้าพนักงานฉุกเฉินการแพทย์')) {
      return 'เจ้าพนักงานฉุกเฉินการแพทย์';
    } else if (pos.includes('พนักงานช่วยเหลือคนไข้')) {
      return 'พนักงานช่วยเหลือคนไข้';
    } else if (pos.includes('พนักงานประจำตึก')) {
      return 'พนักงานประจำตึก';
    } else if (pos.includes('พนักงานเปล')) {
      return 'พนักงานเปล';
    }
    return 'ตำแหน่งอื่นๆ';
  },

  _printSignInSheet(trainingObj, sessionObj, participantsList) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      UI.error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต Pop-up บนเบราว์เซอร์');
      return;
    }

    // ใช้ Utils.buildAttendanceHTML ที่ปรับปรุงแล้วเพื่อสร้าง HTML ใบเซ็นชื่อ
    // ซึ่งรองรับ: narrow margins, Sarabun font, จัดกลุ่มตามหน่วยงาน (ไม่มีแถวหัวหน่วยงาน),
    // dynamic signature columns ตามจำนวนวัน, หัวตารางซ้ำทุกหน้า
    const courseTitle = trainingObj.title || 'ไม่ระบุหัวข้อ';
    const location = trainingObj.location || 'โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน';

    // ── 1. รวบรวมวันที่ทั้งหมดของรอบนี้ ──────────────────────────────
    const dateVal = sessionObj.date || sessionObj.sessionDate;
    let sessionDays = [];

    if (Array.isArray(sessionObj.sessionDates) && sessionObj.sessionDates.length > 0) {
      sessionDays = sessionObj.sessionDates;
    } else if (dateVal) {
      const raw = String(dateVal);
      if (raw.includes('~')) {
        const [startStr, endStr] = raw.split('~');
        const start = new Date(startStr.trim());
        const end = new Date(endStr.trim());
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          sessionDays.push(d.toISOString().slice(0, 10));
        }
      } else {
        sessionDays = [raw.split('T')[0]];
      }
    }

    if (!sessionDays.length) sessionDays = [''];
    const isMultiDay = sessionDays.length > 1;

    // ── 2. สร้าง label วันที่แบบย่อ เช่น "29 มิ.ย.69" ────────────────
    const dayLabels = sessionDays.map(d =>
      d ? Utils.dateInputToThai(d, 'short') : 'ลายมือชื่อ'
    );

    // ── 3. สร้าง date range สำหรับหัวเรื่อง ──────────────────────────
    const dateRangeStr = sessionDays.length > 1
      ? Utils.formatDateRange(sessionDays[0], sessionDays[sessionDays.length - 1], 'long')
      : (sessionDays[0] ? Utils.dateInputToThai(sessionDays[0], 'long') : '-');

    const timeStr = (sessionObj.startTime && sessionObj.endTime)
      ? `เวลา ${Utils.formatTime(sessionObj.startTime)} – ${Utils.formatTime(sessionObj.endTime)} น.`
      : '';

    // ── 4. จัดเรียงตามหน่วยงาน ──────────────────────────────────────
    const sortedList = [...participantsList].sort((a, b) =>
      (a.department || '').localeCompare(b.department || '', 'th')
    );

    // ── 5. คำนวณ colspan ──────────────────────────────────────────────
    const totalCols = 4 + sessionDays.length;

    // ── 6. สร้าง thead คอลัมน์ลายมือชื่อ ──────────────────────────────
    const sigColWidth = isMultiDay ? Math.floor(28 / sessionDays.length) : 28;
    const sigHeaders = dayLabels.map(label =>
      `<th style="width:${sigColWidth}%; padding:5px 4px; border:1px solid #000; text-align:center; font-size:10pt;">${label}</th>`
    ).join('');

    // ── 7. สร้าง tbody (จัดกลุ่มตามหน่วยงาน — ไม่มีแถวหัวหน่วยงาน) ──
    let rowsHtml = '';
    let no = 1;
    sortedList.forEach(p => {
      const sigCells = sessionDays.map(() =>
        `<td style="border:1px solid #000; padding:0; height:26px;"></td>`
      ).join('');

      rowsHtml += `
        <tr>
          <td style="text-align:center; padding:4px 3px; border:1px solid #000; font-size:10pt; white-space:nowrap;">${no++}</td>
          <td style="padding:4px 6px; border:1px solid #000; font-size:10pt;">${p.fullName || '-'}</td>
          <td style="padding:4px 6px; border:1px solid #000; font-size:9.5pt;">${p.position || '-'}</td>
          <td style="padding:4px 6px; border:1px solid #000; font-size:9.5pt;">${p.department || '-'}</td>
          ${sigCells}
        </tr>`;
    });

    // ── 8. สร้าง HTML ────────────────────────────────────────────────
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบลงทะเบียน - ${courseTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
          * { box-sizing: border-box; }
          body {
            font-family: 'Sarabun', sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 15px;
            font-size: 10.5pt;
          }
          
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm 8mm;
            }
            body {
              padding: 0 !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: 'Sarabun', sans-serif !important;
              font-size: 10.5pt !important;
            }
            .no-print { display: none !important; }
            .att-table { page-break-inside: auto; }
            .att-table tr { page-break-inside: avoid; page-break-after: auto; }
            .att-table thead { display: table-header-group; }
            .att-table tfoot { display: table-footer-group; }
          }

          .att-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          .att-table th, .att-table td {
            border: 1px solid #000;
            font-family: 'Sarabun', sans-serif;
          }
          .doc-header {
            text-align: center;
            margin-bottom: 6px;
            font-family: 'Sarabun', sans-serif;
          }
          .doc-header h2 { font-size: 14pt; font-weight: bold; margin: 0 0 3px 0; }
          .doc-header h3 { font-size: 11pt; font-weight: normal; margin: 0 0 2px 0; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom: 12px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #004d40; color: white; border: none; border-radius: 6px; font-family: 'Sarabun'; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            🖨️ พิมพ์เอกสารใบลงทะเบียน
          </button>
        </div>
        
        <table class="att-table">
          <thead>
            <!-- ส่วนหัวเรื่อง — พิมพ์ซ้ำทุกหน้า -->
            <tr>
              <td colspan="${totalCols}" style="border:none; padding-bottom:8px;">
                <div class="doc-header">
                  <h2>แบบลงทะเบียนเข้าร่วมประชุม/อบรม</h2>
                  <h2>เรื่อง ${courseTitle}</h2>
                  <h3>วันที่ ${dateRangeStr}${timeStr ? ' ' + timeStr : ''} ณ ${location}</h3>
                </div>
              </td>
            </tr>
            <!-- หัวคอลัมน์ -->
            <tr style="background:#d1d5db; font-weight:bold; text-align:center; font-size:10pt;">
              <th style="width:4%; padding:5px 3px; border:1px solid #000;">ลำดับ</th>
              <th style="width:24%; padding:5px 6px; border:1px solid #000; text-align:left;">ชื่อ – นามสกุล</th>
              <th style="width:${isMultiDay ? 18 : 20}%; padding:5px 6px; border:1px solid #000; text-align:left;">ตำแหน่ง</th>
              <th style="width:${isMultiDay ? 16 : 20}%; padding:5px 6px; border:1px solid #000; text-align:left;">หน่วยงาน/สังกัด</th>
              ${sigHeaders}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="${totalCols}" style="border:none; padding-top:8px; text-align:right; font-size:10pt; font-weight:bold;">
                รวมจำนวนผู้เข้าอบรมทั้งหมด: ${sortedList.length} ท่าน
              </td>
            </tr>
          </tfoot>
        </table>
        
        <script>
          window.onload = () => { setTimeout(() => window.print(), 500); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  },

  _showQRModal(id, title) {
    const url = Utils.buildRegisterUrl(id);
    const content = `
      <div style="text-align:center; padding: var(--space-4);">
        <p style="font-weight: var(--fw-semi); margin-bottom: var(--space-4); color: var(--navy-800); font-size: var(--text-sm); line-height: 1.5;">${title}</p>
        <div style="background:var(--white); padding: var(--space-4); border-radius: var(--radius-lg); display:inline-block; box-shadow: var(--shadow-sm); margin-bottom: var(--space-4); border: 1px solid var(--gray-200);">
          <canvas id="modalQRCanvas"></canvas>
        </div>
        <div class="form-group">
          <input type="text" readonly value="${url}" id="modalUrlInput" class="form-control" style="text-align:center; background:var(--gray-50); font-size:var(--text-xs);">
        </div>
        <button class="btn btn-teal btn-block" id="modalCopyBtn" style="margin-top: var(--space-3);">
          <i class="fa-solid fa-copy"></i> คัดลอกลิงก์ลงทะเบียน
        </button>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
          <button class="btn btn-outline-navy btn-block btn-sm" id="modalDownloadRawBtn">
            <i class="fa-solid fa-image"></i> โหลด QR
          </button>
          <button class="btn btn-outline-teal btn-block btn-sm" id="modalDownloadCardBtn">
            <i class="fa-solid fa-address-card"></i> โหลดการ์ดสวยงาม
          </button>
        </div>
      </div>
    `;

    UI.modal({
      title: 'QR Code สำหรับลงทะเบียน',
      content,
      size: 'sm'
    });

    setTimeout(() => {
      const canvas = document.getElementById('modalQRCanvas');
      if (canvas) {
        Utils.generateQR(canvas, url, 200);
      }
    }, 50);

    document.getElementById('modalCopyBtn').addEventListener('click', () => {
      Utils.copyToClipboard(url);
    });

    document.getElementById('modalDownloadRawBtn').addEventListener('click', () => {
      Utils.downloadRawQR(url, `QR_Registration_${id}`);
    });

    document.getElementById('modalDownloadCardBtn').addEventListener('click', () => {
      Utils.downloadQRCard(title, url, `Card_Registration_${id}`);
    });
  },

  cleanup() {}
};
