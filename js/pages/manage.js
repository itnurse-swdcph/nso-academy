/**
 * manage.js — Module 4: Management Hub
 * ส่วนขยายฟังก์ชัน: ตรวจสอบรายชื่อสำหรับแอดมิน (เวอร์ชันแก้ไข Bug และจัดกลุ่มข้อมูลใหม่)
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
    
    document.getElementById('adminLoginBtn').addEventListener('click', () => {
      if (isAdmin) {
        Utils.storage.remove('admin_logged_in');
        UI.success('ออกจากระบบแอดมินแล้ว');
        this._renderGate(container);
      } else {
        UI.promptAdminLogin((password) => {
          return password === '11450';
        }).then((success) => {
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
            <button class="btn btn-ghost btn-sm" id="logoutMgmtBtn"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>
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

    document.getElementById('logoutMgmtBtn').addEventListener('click', async () => {
      const ok = await UI.confirm('ต้องการออกจากระบบบริหารจัดการ?', 'ออกจากระบบ', 'danger');
      if (ok) {
        Utils.storage.remove('mgmt_unlock');
        Utils.storage.remove('admin_logged_in');
        this._unlockedTrainingId = null;
        this._unlockedCode = null;
        window.location.hash = '#/';
        window.location.reload();
      }
    });
  },

  // ===================================================
  // ฟังก์ชันย่อย: ตรวจสอบรายชื่อแอดมิน (เวอร์ชันแก้ไข Bug)
  // ===================================================
  async _renderAdminVerification(container, trainingId, title) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 class="page-title">ตรวจสอบรายชื่อผู้ลงทะเบียน</h1>
            <p class="page-subtitle">${title}</p>
          </div>
          <button class="btn btn-outline-navy btn-sm" id="backToHubBtn"><i class="fa-solid fa-arrow-left"></i> กลับหน้าระบบจัดการ</button>
        </div>
        <div id="adminVerifyContent" style="text-align:center; padding: var(--space-8);">
          <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p style="margin-top: var(--space-3); color: var(--gray-600);">กำลังดึงข้อมูลจากชีต REGISTRATIONS...</p>
        </div>
      </div>
    `;

    document.getElementById('backToHubBtn').addEventListener('click', () => {
      this._renderManagementHub(container, trainingId);
    });

    try {
      // เรียกดึงข้อมูลรายชื่อ (API ดึงตามเงื่อนไขของ trainingId)
      const participants = await API.getParticipants(trainingId);
      
      if (!participants || participants.length === 0) {
        document.getElementById('adminVerifyContent').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon"><i class="fa-solid fa-users-slash"></i></div>
            <h3>ยังไม่มีผู้ลงทะเบียน</h3>
            <p>ไม่พบข้อมูลการลงทะเบียนในระบบสำหรับหลักสูตรนี้</p>
          </div>`;
        return;
      }

      // โครงสร้างสำหรับเก็บสถิติตำแหน่งงาน
      const positionStats = {
        'พยาบาลวิชาชีพ': 0,
        'เจ้าพนักงานสาธารณสุข': 0,
        'นักวิชาการสาธารณสุข': 0,
        'เจ้าพนักงานฉุกเฉินการแพทย์': 0,
        'พนักงานช่วยเหลือคนไข้': 0,
        'พนักงานประจำตึก': 0,
        'พนักงานเปล': 0,
        'ตำแหน่งอื่นๆ': 0
      };

      // จุดแก้ไขที่ 2: สร้าง Object เพื่อใช้ในการจัดกลุ่มด้วย 'sessionId'
      const sessionGroups = {};

      participants.forEach(p => {
        // ประมวลผลหมวดหมู่สถิติ
        const posGroup = this._categorizePosition(p.position || '');
        positionStats[posGroup] += 1;

        // จัดกลุ่มตาม sessionId (หากไม่มี ให้จัดเข้ากลุ่ม ทั่วไป)
        const sId = p.sessionId || 'ทั่วไป';
        if (!sessionGroups[sId]) {
          sessionGroups[sId] = [];
        }
        sessionGroups[sId].push(p);
      });

      // สร้าง Dashboard แสดงผลสรุปยอด
      const totalParticipants = participants.length;
      let statsHtml = `
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="card-body">
            <h3 style="margin-bottom: var(--space-4); color: var(--navy-800); border-bottom: 2px solid var(--gray-200); padding-bottom: var(--space-2);">สรุปยอดผู้ลงทะเบียนรวมจากฐานข้อมูล: <span class="text-teal">${totalParticipants}</span> คน</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3);">
      `;
      
      Object.entries(positionStats).forEach(([key, count]) => {
        if (count > 0 || key === 'พยาบาลวิชาชีพ') {
          statsHtml += `
            <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-md); padding: var(--space-3); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: var(--text-sm); color: var(--gray-700);">${key}</span>
              <span style="font-size: var(--text-lg); font-weight: var(--fw-bold); color: var(--navy-600);">${count}</span>
            </div>
          `;
        }
      });
      statsHtml += `</div></div></div>`;

      // จุดแก้ไขที่ 2 & 3: วนลูปสร้างตารางแยกตามกลุ่ม sessionId และตกแต่งสีสันหัวตาราง
      let tablesHtml = `<div>`;
      Object.entries(sessionGroups).forEach(([sId, list]) => {
        tablesHtml += `
          <div class="card" style="margin-bottom: var(--space-5); border-top: 3px solid var(--navy-500);">
            <div class="card-body">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-3); flex-wrap:wrap; gap: var(--space-2);">
                <h4 style="color: var(--navy-700); margin: 0; font-weight: var(--fw-bold);">
                  <i class="fa-solid fa-folder-open text-teal"></i> รอบการอบรม (Session ID): ${sId} 
                  <span style="font-size:var(--text-sm); font-weight:normal; color:var(--gray-500); margin-left:8px;">(${list.length} คน)</span>
                </h4>
                <button class="btn btn-teal btn-sm print-sheet-btn" data-session="${sId}">
                  <i class="fa-solid fa-print"></i> พิมพ์ใบเซ็นชื่อรอบนี้
                </button>
              </div>
              
              <div style="overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--gray-200);">
                <table class="table" style="width: 100%; min-width: 600px; border-collapse: collapse; margin: 0;">
                  <thead style="background-color: var(--navy-700); color: var(--white); border-bottom: 2px solid var(--navy-800);">
                    <tr>
                      <th style="padding: var(--space-3); text-align: center; width: 70px; color: var(--white); font-weight: var(--fw-semi);">ลำดับ</th>
                      <th style="padding: var(--space-3); text-align: left; color: var(--white); font-weight: var(--fw-semi);">ชื่อ-นามสกุล</th>
                      <th style="padding: var(--space-3); text-align: left; color: var(--white); font-weight: var(--fw-semi);">ตำแหน่ง</th>
                      <th style="padding: var(--space-3); text-align: left; color: var(--white); font-weight: var(--fw-semi);">หน่วยงาน/สังกัด</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map((p, i) => `
                      <tr style="border-bottom: 1px solid var(--gray-200); background: ${i % 2 === 0 ? 'var(--white)' : 'var(--gray-50)'};">
                        <td style="padding: var(--space-2-5); text-align: center; color: var(--gray-500);">${i + 1}</td>
                        <td style="padding: var(--space-2-5); font-weight: var(--fw-medium); color: var(--gray-800);">${p.fullName || '-'}</td>
                        <td style="padding: var(--space-2-5); color: var(--gray-700);">${p.position || '-'}</td>
                        <td style="padding: var(--space-2-5); color: var(--gray-700);">${p.department || '-'}</td>
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

      // จัดการ Event สำหรับปุ่มพิมพ์ใบเซ็นชื่อตามกลุ่มรอบอบรมที่กด
      document.querySelectorAll('.print-sheet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const currentBtn = e.target.closest('.print-sheet-btn');
          const sessionKey = currentBtn.dataset.session;
          this._printSignInSheet(title, sessionKey, sessionGroups[sessionKey]);
        });
      });

    } catch (err) {
      console.error(err);
      document.getElementById('adminVerifyContent').innerHTML = `
        <div class="alert alert-danger">
          <i class="fa-solid fa-circle-exclamation"></i> ไม่สามารถประมวลผลข้อมูลรายชื่อได้: ${err.message}
        </div>`;
    }
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

  _printSignInSheet(courseTitle, sessionId, participantsList) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      UI.error('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาอนุญาต Pop-up บนเบราว์เซอร์');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <title>ใบลงทะเบียนเข้ารับการอบรม - ${courseTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap');
          body {
            font-family: 'Sarabun', sans-serif;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
          }
          .header h2 { margin: 0 0 8px 0; font-size: 19px; }
          .header h3 { margin: 0 0 15px 0; font-size: 15px; font-weight: 500; color: #444; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px 10px;
            vertical-align: middle;
          }
          th {
            background-color: #f2f2f2;
            font-weight: 600;
            text-align: center;
          }
          .col-no { width: 50px; text-align: center; }
          .col-name { width: 28%; }
          .col-pos { width: 18%; }
          .col-dep { width: 18%; }
          .col-sign { width: 18%; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            @page { size: A4 portrait; margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom: 15px;">
          <button onclick="window.print()" style="padding: 8px 18px; font-size: 14px; cursor: pointer; background: #004d40; color: white; border: none; border-radius: 4px; font-family: 'Sarabun'; font-weight: 500;">🖨️ พิมพ์เอกสารใบลงทะเบียน</button>
        </div>
        
        <div class="header">
          <h2>ใบลงทะเบียนเข้ารับการอบรม</h2>
          <h2>เรื่อง: ${courseTitle}</h2>
          <h3>รอบการอบรม (Session ID): ${sessionId}</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th class="col-no">ลำดับ</th>
              <th class="col-name">ชื่อ - นามสกุล</th>
              <th class="col-pos">ตำแหน่ง</th>
              <th class="col-dep">หน่วยงาน/สังกัด</th>
              <th class="col-sign">ลายมือชื่อ (เช้า)</th>
              <th class="col-sign">ลายมือชื่อ (บ่าย)</th>
            </tr>
          </thead>
          <tbody>
            ${participantsList.map((p, i) => `
              <tr>
                <td class="col-no">${i + 1}</td>
                <td class="col-name">${p.fullName || '-'}</td>
                <td class="col-pos">${p.position || '-'}</td>
                <td class="col-dep">${p.department || '-'}</td>
                <td class="col-sign"></td>
                <td class="col-sign"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <script>
          window.onload = () => { setTimeout(() => window.print(), 300); }
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
