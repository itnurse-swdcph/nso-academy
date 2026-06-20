/**
 * dashboard.js — Module 4.4: Approval & Analytics Dashboard
 *
 * โครงสร้างใหม่: แบ่งเป็น 3 แท็บ
 *   1. approval     — การอนุมัติผู้เข้าอบรม (โค้ดเดิม ไม่แก้ไข logic)
 *   2. learning     — วิเคราะห์ผลการเรียนรู้ (Pre/Post test) + Export (API.exportLearningExcel)
 *   3. satisfaction — วิเคราะห์ความพึงพอใจ (ไม่ระบุตัวตน) + Export (API.exportSatisfactionExcel)
 *
 * Backend (GAS) ที่รองรับแล้ว:
 *   - AnalyticsService.getTrainingAnalytics() ส่ง individualResults และ satisfactionResponses (anonymized) มาด้วย
 *   - ExportService.exportLearningExcel() / exportSatisfactionExcel() คำนวณ + บันทึก snapshot ลงชีตใหม่
 *     (LearningExport / SatisfactionExport) แยกจากชีตข้อมูลหลัก เพื่อไม่ให้ข้อมูลเดิมสูญหายหรือถูกทับซ้อน
 *   - การ Export ความพึงพอใจถูกสุ่มลำดับ (shuffle) และตัดชื่อ/ID ผู้ตอบออกตั้งแต่ฝั่งเซิร์ฟเวอร์
 */

const DashboardPage = {
  _trainingId: null,
  _analyticsData: null,
  _registrations: [],
  _activeTab: 'approval', // 'approval' | 'learning' | 'satisfaction'
  _charts: {}, // to keep chart instances for cleanup
  _shuffledSatisfaction: null, // cached anonymized + shuffled satisfaction rows

  async render(container, params) {
    const unlockInfo = Utils.storage.get('mgmt_unlock');
    const isAdmin = Utils.storage.get('admin_logged_in') === true;
    const paramId = params.id;

    // Check if unlocked for this training or admin is logged in
    if (!isAdmin && (!unlockInfo || (paramId && unlockInfo.trainingId !== paramId))) {
      container.innerHTML = `
        <div class="animate-fade-in" style="max-width:500px; margin: 4rem auto; text-align:center;">
          <div class="card" style="padding: var(--space-8);">
            <div style="font-size:3rem; margin-bottom: var(--space-4); color: var(--gray-400);"><i class="fa-solid fa-lock"></i></div>
            <h2 class="card-title" style="margin-bottom: var(--space-2);">ต้องระบุรหัสผู้ดูแล</h2>
            <p style="color: var(--gray-600); margin-bottom: var(--space-6);">กรุณาเข้าสู่ระบบบริหารจัดการเพื่อตรวจสอบและวิเคราะห์ข้อมูลหน้านี้</p>
            <a href="#/manage" class="btn btn-primary btn-block">ไปที่ระบบจัดการ</a>
          </div>
        </div>
      `;
      return;
    }

    this._trainingId = paramId || (unlockInfo ? unlockInfo.trainingId : null);
    this._activeTab = 'approval';
    this._shuffledSatisfaction = null;

    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap: var(--space-4);">
          <div>
            <h1 class="page-title">แดชบอร์ด & การวิเคราะห์</h1>
            <p class="page-subtitle">หัวข้อการอบรมรหัส: <strong>${this._trainingId}</strong></p>
          </div>
          <div style="display:flex; gap: var(--space-2);">
            <button class="btn btn-outline-navy btn-sm" id="dashboardBackBtn"><i class="fa-solid fa-arrow-left"></i> เมนูจัดการ</button>
          </div>
        </div>

        <!-- Tab Nav -->
        <div class="tab-container" style="margin-bottom: var(--space-6);">
          <div class="tabs">
            <button class="tab-btn active" data-tab="approval"><i class="fa-solid fa-square-check"></i> การอนุมัติผู้เข้าอบรม</button>
            <button class="tab-btn" data-tab="learning"><i class="fa-solid fa-chart-column"></i> วิเคราะห์ผลการเรียนรู้</button>
            <button class="tab-btn" data-tab="satisfaction"><i class="fa-solid fa-star"></i> วิเคราะห์ความพึงพอใจ</button>
          </div>
        </div>

        <!-- Skeleton loading wrapper -->
        <div id="dashboardContent">
          <div class="page-loader">
            <div class="spinner"></div>
            <span>กำลังโหลดข้อมูลวิเคราะห์...</span>
          </div>
        </div>
      </div>
    `;

    // Hook events
    document.getElementById('dashboardBackBtn').addEventListener('click', () => {
      Router.navigate(`/manage`);
    });

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this._activeTab = e.currentTarget.dataset.tab;
        this._renderActiveTab();
      });
    });

    await this._loadData();
  },

  async _loadData() {
    const contentEl = document.getElementById('dashboardContent');
    if (!contentEl) return;

    try {
      // Load both registrations and analytics data in parallel
      const [regs, analytics] = await Promise.all([
        API.getRegistrationsByTraining(this._trainingId),
        API.getAnalytics(this._trainingId)
      ]);

      this._registrations = regs || [];
      this._analyticsData = analytics || {
        totalRegistrations: 0,
        approvedCount: 0,
        pendingCount: 0,
        preTestAvg: 0,
        postTestAvg: 0,
        improvementPercent: 0,
        passCount: 0,
        failCount: 0,
        satisfactionAvg: 0,
        satisfactionDetails: [],
        individualResults: [],
        satisfactionResponses: []
      };
      this._shuffledSatisfaction = null;

      this._renderActiveTab();

    } catch (err) {
      console.error(err);
      UI.showError(contentEl, 'ไม่สามารถดึงข้อมูลแดชบอร์ดได้: ' + err.message, () => this._loadData());
    }
  },

  _renderActiveTab() {
    const contentEl = document.getElementById('dashboardContent');
    if (!contentEl) return;

    // Clean old charts
    this._cleanupCharts();

    if (this._activeTab === 'approval') {
      this._renderApprovalTab(contentEl);
    } else if (this._activeTab === 'learning') {
      this._renderLearningTab(contentEl);
    } else {
      this._renderSatisfactionTab(contentEl);
    }
  },

  // ════════════════════════════════════════════════════════════
  // ส่วนที่ 1: การอนุมัติผู้เข้าอบรม (เดิม — ไม่เปลี่ยนแปลง logic)
  // ════════════════════════════════════════════════════════════

  _renderApprovalTab(container) {
    const pending = this._registrations.filter(r => r.status === 'PENDING' || !r.status);
    const approved = this._registrations.filter(r => r.status === 'APPROVED' || r.status === 'CONFIRMED');
    const rejected = this._registrations.filter(r => r.status === 'REJECTED');

    container.innerHTML = `
      <div class="grid grid-3" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-info">
            <div class="stat-value">${pending.length}</div>
            <div class="stat-label">รออนุมัติ</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fa-solid fa-circle-check"></i></div>
          <div class="stat-info">
            <div class="stat-value">${approved.length}</div>
            <div class="stat-label">อนุมัติแล้ว</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon navy">👥</div>
          <div class="stat-info">
            <div class="stat-value">${this._registrations.length}</div>
            <div class="stat-label">ลงทะเบียนสะสม</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-4);">
          <div class="card-title"><i class="fa-solid fa-user-check"></i> ตรวจสอบและอนุมัติรายชื่อ</div>
          <div style="display:flex; gap: var(--space-2); width:100%; max-width: 400px;">
            <input type="text" id="approvalSearchInput" class="form-control" placeholder="ค้นหาชื่อหรือหน่วยงาน..." style="font-size: var(--text-sm);">
          </div>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ตำแหน่ง</th>
                  <th>หน่วยงาน</th>
                  <th>สถานะ</th>
                  <th style="text-align:center;">จัดการ</th>
                </tr>
              </thead>
              <tbody id="approvalTableBody">
                ${this._renderApprovalTableRows(this._registrations)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Search event
    const searchInput = document.getElementById('approvalSearchInput');
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = this._registrations.filter(r => 
        (r.fullName || '').toLowerCase().includes(q) || 
        (r.department || '').toLowerCase().includes(q) ||
        (r.position || '').toLowerCase().includes(q)
      );
      document.getElementById('approvalTableBody').innerHTML = this._renderApprovalTableRows(filtered);
      this._hookApprovalActions();
    });

    this._hookApprovalActions();
  },

  _renderApprovalTableRows(list) {
    if (list.length === 0) {
      return `<tr><td colspan="5" style="text-align:center; color: var(--gray-400); padding: var(--space-8);">ไม่พบรายชื่อผู้ลงทะเบียน</td></tr>`;
    }

    return list.map(r => {
      let badge = '<span class="badge badge-gray">รออนุมัติ</span>';
      if (r.status === 'APPROVED' || r.status === 'CONFIRMED') {
        badge = '<span class="badge badge-success">อนุมัติแล้ว</span>';
      } else if (r.status === 'REJECTED') {
        badge = '<span class="badge badge-danger">ปฏิเสธ</span>';
      }

      const isDone = r.status === 'APPROVED' || r.status === 'CONFIRMED' || r.status === 'REJECTED';

      return `
        <tr>
          <td><strong>${r.fullName || ''}</strong></td>
          <td>${r.position || ''}</td>
          <td>${r.department || ''}</td>
          <td>${badge}</td>
          <td style="text-align:center;">
            <div style="display:flex; gap: var(--space-2); justify-content:center;">
              <button class="btn btn-teal btn-xs approve-btn" data-id="${r.regId}" ${r.status === 'APPROVED' ? 'disabled' : ''}>อนุมัติ</button>
              <button class="btn btn-outline-danger btn-xs reject-btn" data-id="${r.regId}" ${r.status === 'REJECTED' ? 'disabled' : ''}>ปฏิเสธ</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  _hookApprovalActions() {
    const tableBody = document.getElementById('approvalTableBody');
    if (!tableBody) return;

    tableBody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const regId = e.target.dataset.id;
        UI.setButtonLoading(e.target, true, '...');
        try {
          await API.approveParticipant(regId);
          UI.success('อนุมัติผู้เข้าอบรมสำเร็จ');
          // Reload
          await this._loadData();
        } catch (err) {
          UI.error(err.message);
          UI.setButtonLoading(e.target, false);
        }
      });
    });

    tableBody.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const regId = e.target.dataset.id;
        const confirm = await UI.confirm('ต้องการปฏิเสธผู้เข้าอบรมรายนี้?', 'ยืนยันปฏิเสธ', 'danger');
        if (!confirm) return;

        UI.setButtonLoading(e.target, true, '...');
        try {
          await API.rejectParticipant(regId);
          UI.success('ปฏิเสธผู้เข้าอบรมสำเร็จ');
          await this._loadData();
        } catch (err) {
          UI.error(err.message);
          UI.setButtonLoading(e.target, false);
        }
      });
    });
  },

  // ════════════════════════════════════════════════════════════
  // ส่วนที่ 2: วิเคราะห์ผลการเรียนรู้ (Learning Analytics)
  // ════════════════════════════════════════════════════════════

  _renderLearningTab(container) {
    const data = this._analyticsData;
    const individuals = data.individualResults || [];

    container.innerHTML = `
      <div class="grid grid-3" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-icon navy"><i class="fa-solid fa-pen-to-square"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.preTestAvg ? data.preTestAvg.toFixed(1) : '0.0'}</div>
            <div class="stat-label">คะแนนเฉลี่ย Pre-test</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">🎯</div>
          <div class="stat-info">
            <div class="stat-value">${data.postTestAvg ? data.postTestAvg.toFixed(1) : '0.0'}</div>
            <div class="stat-label">คะแนนเฉลี่ย Post-test</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">📈</div>
          <div class="stat-info">
            <div class="stat-value">+${data.improvementPercent ? data.improvementPercent.toFixed(1) : '0.0'}%</div>
            <div class="stat-label">ร้อยละการพัฒนาความรู้</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="grid grid-2" style="margin-bottom: var(--space-6);">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-chart-column"></i> เปรียบเทียบผลการทดสอบ Pre/Post Test</div>
          </div>
          <div class="card-body">
            <div style="height: 300px; position:relative;">
              <canvas id="scoreChart"></canvas>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🍰 สัดส่วนผลการประเมิน (ผ่าน / ไม่ผ่านเกณฑ์)</div>
          </div>
          <div class="card-body">
            <div style="height: 300px; position:relative;">
              <canvas id="passRateChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Individual Detail Table -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-4);">
          <div class="card-title"><i class="fa-solid fa-table-list"></i> รายละเอียดรายบุคคล (Pre-test / Post-test)</div>
          <button class="btn btn-outline-teal btn-sm" id="exportLearningBtn"><i class="fa-solid fa-file-excel"></i> Export Excel</button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th style="text-align:center;">คะแนน Pre-test</th>
                  <th style="text-align:center;">คะแนน Post-test</th>
                  <th style="text-align:center;">ผลการประเมิน</th>
                </tr>
              </thead>
              <tbody>
                ${this._renderLearningTableRows(individuals)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('exportLearningBtn').addEventListener('click', () => this._handleExportLearning());

    // Render Charts after DOM injection
    setTimeout(() => {
      this._renderCharts(data);
    }, 50);
  },

  _renderLearningTableRows(individuals) {
    if (!individuals || individuals.length === 0) {
      return `<tr><td colspan="4" style="text-align:center; color: var(--gray-400); padding: var(--space-8);">ยังไม่มีข้อมูลรายบุคคล (รอข้อมูลจากระบบ Pre/Post-test)</td></tr>`;
    }

    return individuals.map(p => {
      const passed = !!p.passed;
      const badge = passed
        ? '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> ผ่านเกณฑ์</span>'
        : '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> ไม่ผ่านเกณฑ์</span>';

      return `
        <tr>
          <td><strong>${p.fullName || '-'}</strong></td>
          <td style="text-align:center;">${p.preScore ?? '-'}</td>
          <td style="text-align:center;">${p.postScore ?? '-'}</td>
          <td style="text-align:center;">${badge}</td>
        </tr>
      `;
    }).join('');
  },

  async _handleExportLearning() {
    try {
      UI.toast('กำลังดึงข้อมูลเพื่อส่งออก...', 'info');
      const rows = await API.exportLearningExcel(this._trainingId);

      if (!rows || rows.length === 0) {
        UI.warning('ไม่มีข้อมูลผลการเรียนรู้สำหรับการ Export');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Learning Analytics");
      XLSX.writeFile(workbook, `ผลการเรียนรู้_${this._trainingId}.xlsx`);
      UI.success('ส่งออกข้อมูลผลการเรียนรู้สำเร็จ');
    } catch (err) {
      UI.error('การส่งออกล้มเหลว: ' + err.message);
    }
  },

  // ════════════════════════════════════════════════════════════
  // ส่วนที่ 3: วิเคราะห์ความพึงพอใจ (Satisfaction Analytics — ไม่ระบุตัวตน)
  // ════════════════════════════════════════════════════════════

  _renderSatisfactionTab(container) {
    const data = this._analyticsData;
    const anonRows = this._getAnonymizedSatisfaction();

    container.innerHTML = `
      <div class="grid grid-4" style="margin-bottom: var(--space-6);">
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-star"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.satisfactionAvg ? data.satisfactionAvg.toFixed(2) : '0.0'}</div>
            <div class="stat-label">ความพึงพอใจเฉลี่ยรวม (เต็ม 5)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon navy">👥</div>
          <div class="stat-info">
            <div class="stat-value">${anonRows.length}</div>
            <div class="stat-label">จำนวนผู้ตอบแบบประเมิน</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal"><i class="fa-solid fa-list-check"></i></div>
          <div class="stat-info">
            <div class="stat-value">${(data.satisfactionDetails || []).length}</div>
            <div class="stat-label">จำนวนหัวข้อประเมิน</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="stat-info">
            <div class="stat-value">ไม่ระบุชื่อ</div>
            <div class="stat-label">รูปแบบข้อมูลตาราง</div>
          </div>
        </div>
      </div>

      <!-- Per-question average -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-star"></i> สรุปผลความพึงพอใจแยกตามหัวข้อ (6 หัวข้อประเมิน)</div>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 70%;">หัวข้อประเมิน</th>
                  <th style="text-align:center;">คะแนนเฉลี่ย (เต็ม 5)</th>
                  <th>ระดับความพึงพอใจ</th>
                </tr>
              </thead>
              <tbody>
                ${this._renderSatisfactionRows(data.satisfactionDetails)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Anonymous individual table -->
      <div class="card">
        <div class="card-header" style="flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <div class="card-title"><i class="fa-solid fa-user-secret"></i> แจกแจงคะแนนรายบุคคล (ไม่ระบุตัวตน)</div>
            <div class="card-subtitle">เรียงลำดับแบบสุ่ม ไม่สามารถย้อนกลับไปหาผู้ตอบรายใดได้</div>
          </div>
          <button class="btn btn-outline-teal btn-sm" id="exportSatisfactionBtn"><i class="fa-solid fa-file-excel"></i> Export Excel</button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ตำแหน่ง</th>
                  ${(data.satisfactionDetails || []).map((_, i) => `<th style="text-align:center;">ข้อ ${i + 1}</th>`).join('')}
                  <th style="text-align:center;">คะแนนรวม</th>
                  <th>ข้อเสนอแนะ</th>
                </tr>
              </thead>
              <tbody>
                ${this._renderAnonymousTableRows(anonRows)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('exportSatisfactionBtn').addEventListener('click', () => this._handleExportSatisfaction());
  },

  /**
   * สร้างข้อมูลความพึงพอใจแบบไม่ระบุตัวตน:
   *  1. ตัดทุกฟิลด์ที่อาจเชื่อมโยงถึงตัวบุคคล (ชื่อ, regId, email ฯลฯ) ออกทั้งหมด เหลือเฉพาะ answers
   *  2. สลับลำดับ (Fisher–Yates shuffle) เพื่อไม่ให้ลำดับเดิมสามารถ map กลับไปหาผู้ตอบในฐานข้อมูลได้
   *  3. ใส่ลำดับใหม่ "คนที่ N" ทับลำดับเดิม
   * ผลลัพธ์จะถูก cache ไว้ระหว่างที่ยังอยู่ในหน้านี้ เพื่อไม่ให้ลำดับเปลี่ยนไปมาเวลาสลับแท็บ
   */
  /**
   * BUG FIX: ไม่กรองเพิ่มเติมอีกต่อไป เพราะ AnalyticsService แก้ respondentIds แล้ว
   * รวมคอลัมน์ใหม่: position (ตำแหน่ง) และ suggestions (ข้อเสนอแนะ)
   * Shuffle ยังทำงานปกติ และครอบคลุมทั้ง 3 ฟิลด์
   */
  _getAnonymizedSatisfaction() {
    if (this._shuffledSatisfaction) return this._shuffledSatisfaction;

    const raw = this._analyticsData?.satisfactionResponses || [];

    // เก็บเฉพาะฟิลด์ที่จำเป็น — ตัด field อื่น ๆ ที่อาจระบุตัวตนทิ้ง
    const sanitized = raw.map(r => ({
      answers: Array.isArray(r.answers) ? [...r.answers] : [],
      position: r.position || '',       // ชื่อตำแหน่ง (ไม่ใช่ชื่อบุคคล)
      suggestions: r.suggestions || ''  // ข้อเสนอแนะ
    }));

    // Fisher–Yates shuffle — ครอบคลุม position และ suggestions ด้วย
    for (let i = sanitized.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sanitized[i], sanitized[j]] = [sanitized[j], sanitized[i]];
    }

    this._shuffledSatisfaction = sanitized.map((r, idx) => ({
      label: `คนที่ ${idx + 1}`,
      answers: r.answers,
      position: r.position,
      suggestions: r.suggestions
    }));

    return this._shuffledSatisfaction;
  },

  _renderAnonymousTableRows(rows) {
    // colspan = 1(ลำดับ) + 1(ตำแหน่ง) + N(ข้อ 1..N) + 1(คะแนนรวม) + 1(ข้อเสนอแนะ)
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="10" style="text-align:center; color: var(--gray-400); padding: var(--space-8);">ยังไม่มีข้อมูลแบบประเมินความพึงพอใจ</td></tr>`;
    }

    return rows.map(r => {
      const answers = r.answers || [];
      const validAnswers = answers.filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
      const totalScore = validAnswers.reduce((s, v) => s + Number(v), 0);
      return `
        <tr>
          <td><strong>${r.label}</strong></td>
          <td>${r.position || '-'}</td>
          ${answers.map(a => `<td style="text-align:center;">${a !== null && a !== undefined ? a : '-'}</td>`).join('')}
          <td style="text-align:center; font-weight:var(--fw-bold); color:var(--navy-600);">${validAnswers.length > 0 ? totalScore : '-'}</td>
          <td style="color:var(--gray-700); font-size:var(--text-sm);">${r.suggestions || '-'}</td>
        </tr>
      `;
    }).join('');
  },

  _renderSatisfactionRows(details) {
    if (!details || details.length === 0) {
      return `<tr><td colspan="3" style="text-align:center; color: var(--gray-400); padding: var(--space-6);">ยังไม่มีข้อมูลผลการประเมินความพึงพอใจ</td></tr>`;
    }

    return details.map(d => {
      const score = d.avgScore || 0;
      let level = 'ปรับปรุง';
      let badgeClass = 'badge-danger';
      if (score >= 4.5) {
        level = 'ดีเยี่ยม';
        badgeClass = 'badge-success';
      } else if (score >= 3.5) {
        level = 'ดี';
        badgeClass = 'badge-teal';
      } else if (score >= 2.5) {
        level = 'ปานกลาง';
        badgeClass = 'badge-warning';
      }

      return `
        <tr>
          <td><strong>${d.questionText}</strong></td>
          <td style="text-align:center; font-weight:var(--fw-bold); font-size:var(--text-lg); color:var(--navy-600);">${score.toFixed(2)}</td>
          <td><span class="badge ${badgeClass}">${level}</span></td>
        </tr>
      `;
    }).join('');
  },

  async _handleExportSatisfaction() {
    try {
      UI.toast('กำลังดึงข้อมูลเพื่อส่งออก...', 'info');
      const rows = await API.exportSatisfactionExcel(this._trainingId);

      if (!rows || rows.length === 0) {
        UI.warning('ไม่มีข้อมูลความพึงพอใจสำหรับการ Export');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Satisfaction Analytics");
      XLSX.writeFile(workbook, `ความพึงพอใจ_ไม่ระบุชื่อ_${this._trainingId}.xlsx`);
      UI.success('ส่งออกข้อมูลความพึงพอใจ (ไม่ระบุชื่อ) สำเร็จ');
    } catch (err) {
      UI.error('การส่งออกล้มเหลว: ' + err.message);
    }
  },

  // ════════════════════════════════════════════════════════════
  // Charts (ใช้ในแท็บวิเคราะห์ผลการเรียนรู้)
  // ════════════════════════════════════════════════════════════

  _renderCharts(data) {
    const scoreCtx = document.getElementById('scoreChart');
    const passRateCtx = document.getElementById('passRateChart');

    if (!scoreCtx || !passRateCtx) return;

    // 1. Bar Chart: Pre vs Post Score Average
    try {
      this._charts.scoreChart = new Chart(scoreCtx, {
        type: 'bar',
        data: {
          labels: ['คะแนนเฉลี่ย Pre-test', 'คะแนนเฉลี่ย Post-test'],
          datasets: [{
            label: 'คะแนนเฉลี่ย',
            data: [data.preTestAvg || 0, data.postTestAvg || 0],
            backgroundColor: ['#0D2B5E', '#00897B'],
            borderRadius: 8,
            maxBarThickness: 60
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, max: 10 } // Assumed max score is 10, adjustment is possible
          }
        }
      });
    } catch (e) {
      console.error('Failed to draw score chart:', e);
    }

    // 2. Pie Chart: Pass / Fail
    try {
      this._charts.passRateChart = new Chart(passRateCtx, {
        type: 'pie',
        data: {
          labels: ['ผ่านเกณฑ์', 'ไม่ผ่านเกณฑ์'],
          datasets: [{
            data: [data.passCount || 0, data.failCount || 0],
            backgroundColor: ['#10b981', '#ef4444'],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    } catch (e) {
      console.error('Failed to draw pass rate chart:', e);
    }
  },

  _cleanupCharts() {
    Object.keys(this._charts).forEach(key => {
      if (this._charts[key] && typeof this._charts[key].destroy === 'function') {
        this._charts[key].destroy();
      }
    });
    this._charts = {};
  },

  cleanup() {
    this._cleanupCharts();
    this._trainingId = null;
    this._analyticsData = null;
    this._registrations = [];
    this._shuffledSatisfaction = null;
  }
};
