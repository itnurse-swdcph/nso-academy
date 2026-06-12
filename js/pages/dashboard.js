/**
 * dashboard.js — Module 4.4: Approval & Analytics Dashboard
 */

const DashboardPage = {
  _trainingId: null,
  _analyticsData: null,
  _registrations: [],
  _activeTab: 'approval', // 'approval' or 'analytics'
  _charts: {}, // to keep chart instances for cleanup

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
            <p style="color: var(--gray-600); margin-bottom: var(--space-6);">กรุณาเข้าสู่ระบบบริหารจัดการเพื่อตรวจสอบและวิเคราะห์ข้อมูลหน้านี้</p>
            <a href="#/manage" class="btn btn-primary btn-block">ไปที่ระบบจัดการ</a>
          </div>
        </div>
      `;
      return;
    }

    this._trainingId = unlockInfo.trainingId;

    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap: var(--space-4);">
          <div>
            <h1 class="page-title">แดชบอร์ด & การวิเคราะห์</h1>
            <p class="page-subtitle">หัวข้อการอบรมรหัส: <strong>${this._trainingId}</strong></p>
          </div>
          <div style="display:flex; gap: var(--space-2);">
            <button class="btn btn-outline-navy btn-sm" id="dashboardBackBtn"><i class="fa-solid fa-arrow-left"></i> เมนูจัดการ</button>
            <button class="btn btn-outline-teal btn-sm" id="exportExcelBtn"><i class="fa-solid fa-file-excel"></i> Export Excel</button>
          </div>
        </div>

        <!-- Tab Nav -->
        <div class="tab-container" style="margin-bottom: var(--space-6);">
          <div class="tabs">
            <button class="tab-btn active" data-tab="approval"><i class="fa-solid fa-square-check"></i> การอนุมัติผู้เข้าอบรม</button>
            <button class="tab-btn" data-tab="analytics"><i class="fa-solid fa-chart-column"></i> วิเคราะห์ผลการเรียนรู้</button>
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

    document.getElementById('exportExcelBtn').addEventListener('click', () => this._handleExportExcel());

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this._activeTab = e.target.dataset.tab;
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
        satisfactionDetails: []
      };

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
    } else {
      this._renderAnalyticsTab(contentEl);
    }
  },

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

  _renderAnalyticsTab(container) {
    const data = this._analyticsData;

    container.innerHTML = `
      <div class="grid grid-4" style="margin-bottom: var(--space-6);">
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
            <div class="stat-label">การพัฒนาความรู้</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-star"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.satisfactionAvg ? data.satisfactionAvg.toFixed(2) : '0.0'}</div>
            <div class="stat-label">ความพึงพอใจเฉลี่ย</div>
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

      <!-- Satisfaction Summary -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-star"></i> สรุปผลความพึงพอใจแยกตามหัวข้อ</div>
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
    `;

    // Render Charts after DOM injection
    setTimeout(() => {
      this._renderCharts(data);
    }, 50);
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

  async _handleExportExcel() {
    try {
      UI.toast('กำลังดึงข้อมูลเพื่อส่งออก...', 'info');
      // Create and download Excel sheet using SheetJS Client-side or API endpoint
      const rawData = await API.exportAnalyticsExcel(this._trainingId);
      
      // RawData is expected to be an array of objects
      if (!rawData || rawData.length === 0) {
        UI.warning('ไม่มีข้อมูลสำหรับการ Export');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rawData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Data");
      
      XLSX.writeFile(workbook, `Training_Analytics_${this._trainingId}.xlsx`);
      UI.success('ส่งออกไฟล์ Excel สำเร็จ');
    } catch (err) {
      UI.error('การส่งออกล้มเหลว: ' + err.message);
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
  }
};
