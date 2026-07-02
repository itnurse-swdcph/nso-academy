/**
 * app.js — Application Bootstrap
 * Initializes router, nav, date display, PWA service worker
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // ── Register all routes ──────────────────────────────────────
  Router
    .register('/',            HomePage,         { title: 'หน้าหลัก' })
    .register('/create',      CreateTrainingPage, { title: 'สร้างหัวข้ออบรม' })
    .register('/register',    RegisterPage,     { title: 'ลงทะเบียนอบรม' })
    .register('/verify',      VerifyPage,       { title: 'ตรวจสอบรายชื่อ' })
    .register('/manage',      ManagePage,       { title: 'ระบบบริหารจัดการ' })
    .register('/pretest',     PretestPage,      { title: 'Pre-test' })
    .register('/posttest',    PosttestPage,     { title: 'Post-test' })
    .register('/satisfaction', SatisfactionPage, { title: 'แบบประเมินความพึงพอใจ' })
    .register('/dashboard',   DashboardPage,    { title: 'อนุมัติ & วิเคราะห์' })
    .register('/take-test',   TakeTestPage,     { title: 'ทำแบบทดสอบ' });

  // ── Init router ──────────────────────────────────────────────
  Router.init('app');

  // ── Sidebar toggle (Mobile) ───────────────────────────────────
  const menuBtn = document.getElementById('menuToggleBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  const openSidebar = () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  menuBtn?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);

  // Close sidebar when nav item clicked (mobile)
  sidebar?.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 1024) closeSidebar();
    });
  });

  // ── Display current Thai date ─────────────────────────────────
  const dateEl = document.getElementById('headerDate');
  if (dateEl) {
    dateEl.textContent = Utils.today('long');
  }
  // ── Global Logout Button (เพิ่มใหม่เพื่อแก้ไขบั๊กปุ่มไม่ออกจากการระบบ) ──
  const globalLogoutBtn = document.getElementById('globalLogoutBtn');
  if (globalLogoutBtn) {
    globalLogoutBtn.addEventListener('click', async () => {
      // 1. ถามยืนยันการออกจากระบบ
      const isConfirmed = await UI.confirm('คุณต้องการออกจากระบบและล้างเซสชันทั้งหมดใช่หรือไม่?', 'ยืนยันการออกจากระบบ');
      if (!isConfirmed) return;

      // 2. แสดง Loading Popup ให้ผู้ใช้ทราบว่าระบบกำลังทำงาน
      UI.showLoadingOverlay('กำลังออกจากระบบ...');

      // 3. หน่วงเวลาเล็กน้อยเพื่อให้ UI ดูสมูทขึ้น (0.8 วินาที)
      setTimeout(() => {
        // 4. ล้างข้อมูล State และ Session ออกจาก LocalStorage ให้เกลี้ยง
        Utils.storage.remove('admin_logged_in');
        Utils.storage.remove('mgmt_unlock');
        Utils.storage.remove('token');
        Utils.currentTrainingTopic.clear();
        
        // ถ้าต้องการล้างทั้งหมดแบบไม่เหลือซาก สามารถใช้ localStorage.clear(); ได้เลย

        // ปิดหน้าจอ Loading และแจ้งเตือนผลลัพธ์
        UI.hideLoadingOverlay();
        UI.success('ออกจากระบบเรียบร้อยแล้ว');

        // 5. รีไดเรกต์ไปที่หน้าหลัก (หรือหน้า Login)
        Router.navigate('/');
        
        // (Optional) หากมีปัญหาข้อมูลหน้าจอค้าง สามารถใช้คำสั่งนี้เพื่อบังคับรีเฟรชหน้าเว็บทั้งหน้าได้:
        // window.location.reload();
      }, 800);
    });
  }

  // ── Offline / Online indicator ────────────────────────────────
  window.addEventListener('offline', () => {
    UI.warning('ขาดการเชื่อมต่ออินเทอร์เน็ต ข้อมูลอาจไม่ถูกต้อง', 'Offline');
  });
  window.addEventListener('online', () => {
    UI.success('กลับมาออนไลน์แล้ว', 'Online');
  });

  // ── Register Service Worker (PWA) ─────────────────────────────
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('[PWA] Service Worker registered');
    } catch (err) {
      console.warn('[PWA] Service Worker registration failed:', err);
    }
  }
}

// ── Take Test Page (inline — for QR code deep links) ─────────────
const TakeTestPage = {
  render(container, params) {
    const { id, type } = params;
    if (!id || !type) {
      UI.showError(container, 'ลิงก์ไม่ถูกต้อง กรุณาสแกน QR Code ใหม่อีกครั้ง');
      return;
    }

    // Redirect to pretest/posttest page with params
    if (type === 'PRE') {
      Router.navigate(`/pretest?id=${id}&mode=take`);
    } else {
      Router.navigate(`/posttest?id=${id}&mode=take`);
    }
  },
  cleanup() {}
};
