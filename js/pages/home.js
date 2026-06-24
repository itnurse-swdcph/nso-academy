/**
 * home.js — Home Dashboard Page (Module: หน้าหลัก)
 */

const HomePage = {
  _statsCache: null,

  async render(container, params) {
    this._container = container;
    container.innerHTML = `
      <div class="animate-fade-in">
        <!-- Welcome Banner -->
        <div class="dashboard-welcome">
          <div class="welcome-content">
            <div class="welcome-badge"><i class="fa-solid fa-hospital"></i> โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน</div>
            <h1 class="welcome-title">ระบบลงทะเบียนอบรมออนไลน์</h1>
            <p class="welcome-subtitle">ภารกิจด้านการพยาบาล — จัดการการอบรม ลงทะเบียน และประเมินผลได้ทุกที่ ทุกเวลา</p>
            <div class="welcome-stats" id="welcomeStats">
              <div class="welcome-stat-item">
                <div class="welcome-stat-value" id="statTotal">—</div>
                <div class="welcome-stat-label">หัวข้ออบรมทั้งหมด</div>
              </div>
              <div class="welcome-stat-item">
                <div class="welcome-stat-value" id="statActive">—</div>
                <div class="welcome-stat-label">มีรอบเปิดรับสมัคร</div>
              </div>
              <div class="welcome-stat-item">
                <div class="welcome-stat-value" id="statToday">—</div>
                <div class="welcome-stat-label">วันนี้ ${Utils.today('short')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-grid" id="statsGrid">
          ${this._skeletonStats()}
        </div>

        <!-- Module Navigation Cards -->
        <div class="page-header">
          <h2 class="page-title" style="font-size: var(--text-xl);">เมนูหลัก</h2>
        </div>
        <div class="features-grid">
          ${this._renderFeatureCards()}
        </div>

        <!-- Recent Trainings -->
        <div class="recent-section">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title"><i class="fa-solid fa-clipboard-list"></i> หัวข้ออบรมล่าสุด</div>
                <div class="card-subtitle">รายการการอบรมที่สร้างล่าสุด</div>
              </div>
              <a href="#/create" class="btn btn-teal btn-sm">+ สร้างใหม่</a>
            </div>
            <div id="recentTrainings" class="card-body" style="padding: 0;">
              ${UI.showSkeleton ? '' : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Show skeleton first
    const recentEl = container.querySelector('#recentTrainings');
    UI.showSkeleton(recentEl, 'list', 4);

    // Load data
    await this._loadData(container);
  },

  _skeletonStats() {
    return Array(4).fill(0).map(() => `
      <div class="stat-card">
        <div class="skeleton skeleton-circle" style="width:52px;height:52px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton skeleton-text short" style="height:32px;margin-bottom:8px;"></div>
          <div class="skeleton skeleton-text medium"></div>
        </div>
      </div>
    `).join('');
  },

  _renderFeatureCards() {
    const cards = [
      { href: '#/create',       icon: '<i class="fa-solid fa-circle-plus"></i>', title: 'สร้างหัวข้ออบรม',      desc: 'สร้างหัวข้อการอบรมใหม่ กำหนดวันและเวลาหลายรอบได้' },
      { href: '#/register',     icon: '<i class="fa-solid fa-pen-to-square"></i>', title: 'ลงทะเบียนอบรม',        desc: 'ลงทะเบียนเข้าร่วมการอบรม ค้นหาชื่อพนักงานจากฐานข้อมูล' },
      { href: '#/verify',       icon: '<i class="fa-solid fa-circle-check"></i>', title: 'ตรวจสอบรายชื่อ',       desc: 'ดูรายชื่อผู้เข้าอบรม พิมพ์ใบเซ็นชื่อและ Export Excel' },
      { href: '#/manage',       icon: '<i class="fa-solid fa-sliders"></i>', title: 'ระบบบริหารจัดการ',    desc: 'จัดการ Pre/Post-test, แบบประเมิน และอนุมัติผู้เข้าอบรม' },
      { href: '#/pretest',      icon: '<i class="fa-solid fa-file-circle-question"></i>', title: 'Pre-test',              desc: 'สร้างข้อสอบก่อนอบรม พร้อม QR Code สำหรับผู้เรียน' },
      { href: '#/satisfaction', icon: '<i class="fa-solid fa-star"></i>', title: 'แบบประเมินความพึงพอใจ', desc: 'สร้างแบบประเมินและวิเคราะห์ผลความพึงพอใจ' },
    ];
    return cards.map(c => `
      <a href="${c.href}" class="feature-card" data-route="${c.href.slice(1)}">
        <div class="feature-card-icon">${c.icon}</div>
        <div class="feature-card-title">${c.title}</div>
        <div class="feature-card-desc">${c.desc}</div>
      </a>
    `).join('');
  },

  async _loadData(container) {
    try {
      const trainings = await API.getTrainings();
      this._statsCache = trainings;

      // วันที่ปัจจุบันสำหรับเปรียบเทียบ
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

      // คำนวณหัวข้อที่เปิดรับสมัคร (ใช้ isExpired จาก GAS ถ้ามี)
      const active = trainings.filter(t => {
        if (typeof t.isExpired === 'boolean') return !t.isExpired;
        if (typeof t.hasActiveSessions === 'boolean') return t.hasActiveSessions;
        const sessions = t.sessions || [];
        if (sessions.length > 0) {
          return sessions.some(s => (s.sessionDate || s.date || '').slice(0, 10) >= todayStr);
        }
        return t.status === 'ACTIVE';
      });

      const today = trainings.filter(t => (t.sessions || []).some(s => (s.sessionDate || '').slice(0, 10) === todayStr));

      // Update UI Stats
      const statTotal = container.querySelector('#statTotal');
      const statActive = container.querySelector('#statActive');
      const statToday = container.querySelector('#statToday');
      if (statTotal) statTotal.textContent = trainings.length;
      if (statActive) statActive.textContent = active.length;
      if (statToday) statToday.textContent = today.length;

      const statsGrid = container.querySelector('#statsGrid');
      if (statsGrid) {
        statsGrid.innerHTML = `
          <div class="stat-card">
            <div class="stat-icon navy"><i class="fa-solid fa-folder-open"></i></div>
            <div class="stat-info">
              <div class="stat-value">${trainings.length}</div>
              <div class="stat-label">หัวข้ออบรมทั้งหมด</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon teal"><i class="fa-solid fa-circle-play"></i></div>
            <div class="stat-info">
              <div class="stat-value">${active.length}</div>
              <div class="stat-label">มีรอบเปิดรับสมัคร</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon success"><i class="fa-solid fa-calendar-days"></i></div>
            <div class="stat-info">
              <div class="stat-value">${today.length}</div>
              <div class="stat-label">อบรมวันนี้</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning"><i class="fa-solid fa-chart-column"></i></div>
            <div class="stat-info">
              <div class="stat-value">${trainings.reduce((s, t) => s + (t.sessionCount || 0), 0)}</div>
              <div class="stat-label">รอบการอบรมทั้งหมด</div>
            </div>
          </div>
        `;
      }

      const recentEl = container.querySelector('#recentTrainings');
      if (!recentEl) return;

      if (!trainings.length) {
        UI.showEmpty(recentEl, {
          icon: '<i class="fa-solid fa-clipboard-list"></i>',
          title: 'ยังไม่มีหัวข้ออบรม',
          desc: 'เริ่มต้นสร้างหัวข้ออบรมใหม่ได้เลย',
          action: '<a href="#/create" class="btn btn-teal">+ สร้างหัวข้ออบรม</a>'
        });
        return;
      }

      const recent = trainings.slice(0, 5);
      recentEl.innerHTML = `
        <div>
          ${recent.map(t => {
            // เช็กสถานะการเปิดรับสมัครจาก isExpired (ที่คำนวณจาก GAS)
            const isClosed = t.isExpired === true;
            const isOpen = !isClosed;

            const badgeHtml = isOpen
              ? `<span class="badge badge-success"><i class="fa-solid fa-lock-open"></i> เปิด</span>`
              : `<span class="badge" style="background-color: #6c757d; color: #fff; padding: 0.25em 0.6em; border-radius: var(--radius-sm); font-size: var(--text-xs);"><i class="fa-solid fa-lock"></i> ปิด</span>`;

            const registerBtn = isOpen
              ? `<a href="#/register?id=${t.trainingId}" class="btn btn-outline-teal btn-sm">ลงทะเบียน</a>`
              : `<button class="btn btn-sm" disabled style="background-color: var(--gray-100); color: var(--gray-400); border: 1px solid var(--gray-200); cursor: not-allowed; opacity: 0.7;" title="สิ้นสุดการจัดอบรมแล้ว">ปิดรับสมัคร</button>`;

            return `
            <div style="display:flex; align-items:center; gap: var(--space-4); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--gray-100);">
              <div style="width:44px; height:44px; border-radius:var(--radius-lg); background: linear-gradient(135deg, var(--navy-100), var(--teal-50)); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;"><i class="fa-solid fa-clipboard-list"></i></div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight: var(--fw-semi); color: var(--gray-800); font-size: var(--text-sm); margin-bottom: 2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.title}</div>
                <div style="font-size: var(--text-xs); color: var(--gray-500);">${t.organizer || ''} · ${t.sessionCount || 0} รอบ</div>
              </div>
              ${badgeHtml}
              <div style="display:flex; gap: 6px; align-items:center;">
                <button class="btn btn-outline-navy btn-sm qr-btn" data-id="${t.trainingId}" data-title="${t.title}" style="padding: 0 var(--space-2); height: 32px;"><i class="fa-solid fa-qrcode"></i></button>
                <button class="btn btn-outline-navy btn-sm edit-btn" data-id="${t.trainingId}" style="padding: 0 var(--space-2); height: 32px;"><i class="fa-solid fa-pen-to-square"></i></button>
                ${registerBtn}
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;

      // Event Listeners
      recentEl.querySelectorAll('.qr-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._showQRModal(btn.dataset.id, btn.dataset.title);
      }));

      recentEl.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        this._handleEditClick(btn.dataset.id);
      }));

    } catch (err) {
      const statsGrid = container.querySelector('#statsGrid');
      const recentEl = container.querySelector('#recentTrainings');
      if (statsGrid) statsGrid.innerHTML = '';
      if (recentEl) {
        UI.showError(recentEl, 'ไม่สามารถโหลดข้อมูลได้: ' + err.message, () => this._loadData(container));
      }
    }
  },

  _handleEditClick(id) {
    const unlockInfo = Utils.storage.get('mgmt_unlock');
    const isAdmin = Utils.storage.get('admin_logged_in') === true;
    if (isAdmin || (unlockInfo && unlockInfo.trainingId === id)) {
      EditTrainingPage.open(id, () => this._loadData(this._container));
      return;
    }

    const content = `
      <div style="padding: var(--space-4); text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: var(--space-3); color: var(--navy-700);"><i class="fa-solid fa-lock"></i></div>
        <p style="margin-bottom: var(--space-4); font-size: var(--text-sm); color: var(--gray-600);">กรุณากรอกรหัสผู้ดูแล (Management Code) เพื่อทำการแก้ไข</p>
        <div class="form-group" style="text-align: left; margin-bottom: var(--space-4);">
          <input type="text" id="modalMgmtCodeInput" class="form-control" placeholder="รหัสผู้ดูแล 6 หลัก" maxlength="12" style="text-transform:uppercase; letter-spacing:0.2em; text-align:center; font-size: var(--text-lg);">
        </div>
        <button class="btn btn-primary btn-block" id="modalUnlockBtn">ยืนยันรหัสผ่าน</button>
        <div id="modalUnlockError" class="alert alert-danger hidden" style="margin-top: var(--space-3);">
          รหัสไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง
        </div>
      </div>
    `;

    UI.modal({
      title: 'สิทธิ์การแก้ไขข้อมูล',
      content,
      size: 'sm'
    });

    const codeInput = document.getElementById('modalMgmtCodeInput');
    if (codeInput) {
      codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
    }

    const unlockBtn = document.getElementById('modalUnlockBtn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        if (!code) { UI.warning('กรุณาใส่รหัสผู้ดูแล'); return; }

        const errEl = document.getElementById('modalUnlockError');
        UI.setButtonLoading(unlockBtn, true, 'กำลังตรวจสอบ...');
        errEl.classList.add('hidden');

        try {
          await API.validateCode(id, code);
          Utils.storage.set('mgmt_unlock', { trainingId: id, code });
          
          // Close modal
          const modal = document.getElementById('modal-container');
          if (modal) modal.innerHTML = '';

          UI.success('เข้าสู่ระบบสำเร็จ');
          EditTrainingPage.open(id, () => this._loadData(this._container));
        } catch (err) {
          errEl.classList.remove('hidden');
        } finally {
          UI.setButtonLoading(unlockBtn, false);
        }
      });
    }
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

    // Generate QR code onto the canvas
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

  cleanup() {
    this._statsCache = null;
  }
};
