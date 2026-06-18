/**
 * ui.js — UI Utility Layer
 * Toast notifications, modals, skeleton loaders, confirm dialogs
 */

const UI = {
  // ── Toast Notifications ──────────────────────────────────────
  /**
   * แสดง Toast notification
   * @param {string} message - ข้อความหลัก
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} [title] - หัวเรื่อง (optional)
   * @param {number} [duration=4000] - milliseconds
   */
  toast(message, type = 'info', title = null, duration = 4000) {
    const icons = { 
      success: '<i class="fa-solid fa-circle-check text-success"></i>', 
      error: '<i class="fa-solid fa-circle-xmark text-danger"></i>', 
      warning: '<i class="fa-solid fa-triangle-exclamation text-warning"></i>', 
      info: '<i class="fa-solid fa-circle-info text-info"></i>' 
    };
    const titles = { success: 'สำเร็จ', error: 'เกิดข้อผิดพลาด', warning: 'คำเตือน', info: 'แจ้งให้ทราบ' };

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${title || titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="UI._removeToast(this.parentElement)">✕</button>
    `;

    container.appendChild(toast);

    // Auto remove
    const timerId = setTimeout(() => UI._removeToast(toast), duration);
    toast._timerId = timerId;

    return toast;
  },

  _removeToast(toast) {
    if (!toast || !toast.parentElement) return;
    clearTimeout(toast._timerId);
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  },

  /** Shorthand helpers */
  success(msg, title)  { return this.toast(msg, 'success', title); },
  error(msg, title)    { return this.toast(msg, 'error', title, 6000); },
  warning(msg, title)  { return this.toast(msg, 'warning', title); },
  info(msg, title)     { return this.toast(msg, 'info', title); },

  // ── Modal System ─────────────────────────────────────────────
  /**
   * แสดง Modal
   * @param {object} options - { title, content, size, footer, onClose }
   * @returns {{ el, close }} modal element and close function
   */
  modal({ title, content, size = '', footer = null, onClose = null, id = null } = {}) {
    const container = document.getElementById('modal-container');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    if (id) overlay.id = id;

    overlay.innerHTML = `
      <div class="modal ${size ? 'modal-' + size : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${Date.now()}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" aria-label="ปิด">✕</button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    container.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('show'));

    const close = () => {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
      setTimeout(() => overlay.remove(), 300);
      if (onClose) onClose();
    };

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Close button
    overlay.querySelector('.modal-close').addEventListener('click', close);

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    return { el: overlay, close };
  },

  /**
   * Confirm dialog — returns Promise<boolean>
   * @param {string} message
   * @param {string} [confirmText]
   * @param {'danger'|'primary'|'teal'} [btnType]
   */
  confirm(message, confirmText = 'ยืนยัน', btnType = 'danger') {
    return new Promise((resolve) => {
      let resolved = false;
      const m = this.modal({
        title: 'ยืนยันการดำเนินการ',
        content: `
          <div style="text-align:center; padding: var(--space-4) 0;">
            <div style="font-size: 3rem; margin-bottom: var(--space-4); color: var(--warning);"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <p style="color: var(--gray-700); font-size: var(--text-base);">${message}</p>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost" id="confirmCancel">ยกเลิก</button>
          <button class="btn btn-${btnType}" id="confirmOk">${confirmText}</button>
        `,
        onClose: () => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      });

      m.el.querySelector('#confirmCancel').addEventListener('click', () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
        m.close();
      });
      m.el.querySelector('#confirmOk').addEventListener('click', () => {
        if (!resolved) {
          resolved = true;
          resolve(true);
        }
        m.close();
      });
    });
  },

  /**
   * Alert dialog (informational)
   */
  alert(message, title = 'แจ้งเตือน') {
    return new Promise((resolve) => {
      const m = this.modal({
        title,
        content: `<p style="color: var(--gray-700);">${message}</p>`,
        footer: `<button class="btn btn-primary" id="alertOk">ตกลง</button>`,
        onClose: () => resolve()
      });
      m.el.querySelector('#alertOk').addEventListener('click', () => {
        m.close(); resolve();
      });
    });
  },

  // ── Button Loading State ─────────────────────────────────────
  /**
   * ตั้งสถานะ loading ของ button
   * @param {HTMLButtonElement} btn
   * @param {boolean} loading
   * @param {string} [loadingText]
   */
  setButtonLoading(btn, loading, loadingText = 'กำลังดำเนินการ...') {
    if (!btn) return;
    if (loading) {
      btn._originalHTML = btn.innerHTML;
      btn._originalDisabled = btn.disabled;
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-spinner"></span> ${loadingText}`;
    } else {
      btn.innerHTML = btn._originalHTML || btn.innerHTML;
      btn.disabled = btn._originalDisabled || false;
    }
  },

  // ── Skeleton Loaders ─────────────────────────────────────────
  /**
   * แสดง skeleton loading ใน container
   * @param {HTMLElement} container
   * @param {'cards'|'table'|'list'} type
   * @param {number} count
   */
  showSkeleton(container, type = 'cards', count = 3) {
    let html = '';
    if (type === 'cards') {
      for (let i = 0; i < count; i++) {
        html += `
          <div class="card" style="padding: var(--space-5); margin-bottom: var(--space-4);">
            <div class="skeleton skeleton-text medium" style="margin-bottom: var(--space-3);"></div>
            <div class="skeleton skeleton-text long" style="margin-bottom: var(--space-2);"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>`;
      }
    } else if (type === 'table') {
      for (let i = 0; i < count; i++) {
        html += `
          <div class="skeleton-table-row">
            <div class="skeleton" style="width:40px; height:14px; flex-shrink:0;"></div>
            <div class="skeleton" style="flex:2; height:14px;"></div>
            <div class="skeleton" style="flex:1.5; height:14px;"></div>
            <div class="skeleton" style="flex:1.5; height:14px;"></div>
          </div>`;
      }
    } else if (type === 'list') {
      for (let i = 0; i < count; i++) {
        html += `
          <div style="display:flex; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--gray-100);">
            <div class="skeleton skeleton-circle" style="width:40px; height:40px; flex-shrink:0;"></div>
            <div style="flex:1;">
              <div class="skeleton skeleton-text medium" style="margin-bottom: var(--space-2);"></div>
              <div class="skeleton skeleton-text short"></div>
            </div>
          </div>`;
      }
    }
    container.innerHTML = html;
  },

  // ── Page Loading State ───────────────────────────────────────
  showPageLoader(container) {
    container.innerHTML = `
      <div class="page-loader animate-fade-in">
        <div class="spinner"></div>
        <span style="color: var(--gray-500); font-size: var(--text-sm);">กำลังโหลดข้อมูล...</span>
      </div>
    `;
  },

  showLoadingOverlay(message = 'กำลังโหลดข้อมูล...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-loading-overlay';
      overlay.className = 'modal-overlay show';
      overlay.style.zIndex = '9999';
      overlay.style.background = 'rgba(255, 255, 255, 0.2)';
      overlay.style.backdropFilter = 'blur(12px)';
      overlay.style.border = '1px solid rgba(255,255,255,0.3)';
      overlay.innerHTML = `
        <div style="background: var(--white); padding: var(--space-6) var(--space-8); border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: var(--space-3); box-shadow: var(--shadow-lg); max-width: 90%; text-align: center;">
          <div class="spinner"></div>
          <span style="font-weight: var(--fw-semi); color: var(--navy-800);" id="global-loading-text">${message}</span>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      const textEl = document.getElementById('global-loading-text');
      if (textEl) textEl.textContent = message;
      overlay.classList.add('show');
    }
    document.body.style.overflow = 'hidden';
  },

  hideLoadingOverlay() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.remove();
    }
    document.body.style.overflow = '';
  },

  // ── Empty State ───────────────────────────────────────────────
  showEmpty(container, { icon = '<i class="fa-solid fa-box-open"></i>', title = 'ไม่มีข้อมูล', desc = '', action = null } = {}) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        ${desc ? `<div class="empty-state-desc">${desc}</div>` : ''}
        ${action ? `<div>${action}</div>` : ''}
      </div>
    `;
  },

  // ── Error State ───────────────────────────────────────────────
  showError(container, message, retryFn = null) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <div class="empty-state-icon" style="color: var(--danger);"><i class="fa-solid fa-circle-exclamation"></i></div>
        <div class="empty-state-title">เกิดข้อผิดพลาด</div>
        <div class="empty-state-desc">${message}</div>
        ${retryFn ? `<button class="btn btn-outline-teal" id="retryBtn"><i class="fa-solid fa-arrows-rotate"></i> ลองใหม่</button>` : ''}
      </div>
    `;
    if (retryFn) {
      container.querySelector('#retryBtn')?.addEventListener('click', retryFn);
    }
  },

  /**
   * Custom Admin Login Modal Prompt
   * @param {function} validateFn - Callback returning Promise<boolean> or boolean
   * @returns {Promise<boolean>}
   */
  promptAdminLogin(validateFn) {
    return new Promise((resolve) => {
      let resolved = false;
      const m = this.modal({
        title: 'เข้าสู่ระบบสำหรับแอดมิน',
        content: `
          <div class="admin-login-modal-body" style="text-align: center; padding: var(--space-4) 0;">
            <div style="font-size: 3.5rem; color: var(--navy-500); margin-bottom: var(--space-4);">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <p style="color: var(--gray-600); font-size: var(--text-sm); margin-bottom: var(--space-5);">
              กรุณากรอกรหัสผ่านผู้ดูแลระบบ (Admin Password) เพื่อเข้าใช้งานระบบจัดการสูงสุด
            </p>
            <div class="form-group" style="text-align: left; max-width: 320px; margin: 0 auto;">
              <label class="form-label" for="adminPasswordInput" style="font-weight: var(--fw-medium);">รหัสผ่านแอดมิน</label>
              <div class="input-group">
                <input type="password" id="adminPasswordInput" class="form-control" placeholder="••••••••" style="letter-spacing: 0.2em; font-size: var(--text-lg); text-align: center; border-right: none;">
                <button class="input-group-btn" id="toggleAdminPasswordBtn" type="button" style="border: 1.5px solid var(--gray-300); border-radius: 0 var(--radius-lg) var(--radius-lg) 0; background: var(--gray-50); color: var(--gray-500); width: 44px; display: flex; align-items: center; justify-content: center;">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
              <div id="adminLoginModalError" class="alert alert-danger hidden" style="margin-top: var(--space-3); padding: var(--space-2) var(--space-3); font-size: var(--text-xs);">
                <span class="alert-icon"><i class="fa-solid fa-circle-xmark"></i></span>
                <div class="alert-content">รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง</div>
              </div>
            </div>
          </div>
        `,
        footer: `
          <button class="btn btn-ghost" id="adminLoginCancelBtn">ยกเลิก</button>
          <button class="btn btn-primary" id="adminLoginSubmitBtn">เข้าสู่ระบบ</button>
        `,
        onClose: () => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      });

      const passInput = m.el.querySelector('#adminPasswordInput');
      const toggleBtn = m.el.querySelector('#toggleAdminPasswordBtn');
      const errorEl = m.el.querySelector('#adminLoginModalError');
      const submitBtn = m.el.querySelector('#adminLoginSubmitBtn');
      const cancelBtn = m.el.querySelector('#adminLoginCancelBtn');

      // Focus input
      setTimeout(() => {
        if (passInput) passInput.focus();
      }, 150);

      toggleBtn.addEventListener('click', () => {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          toggleBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
          passInput.type = 'password';
          toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
      });

      const handleLogin = async () => {
        const password = passInput.value.trim();
        if (!password) {
          errorEl.querySelector('.alert-content').textContent = 'กรุณากรอกรหัสผ่าน';
          errorEl.classList.remove('hidden');
          return;
        }

        UI.setButtonLoading(submitBtn, true, 'กำลังตรวจสอบ...');
        errorEl.classList.add('hidden');

        try {
          const isValid = await validateFn(password);
          if (isValid) {
            resolved = true;
            resolve(true);
            m.close();
          } else {
            errorEl.querySelector('.alert-content').textContent = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
            errorEl.classList.remove('hidden');
            passInput.value = '';
            passInput.focus();
          }
        } catch (e) {
          errorEl.querySelector('.alert-content').textContent = 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน';
          errorEl.classList.remove('hidden');
        } finally {
          UI.setButtonLoading(submitBtn, false);
        }
      };

      submitBtn.addEventListener('click', handleLogin);
      cancelBtn.addEventListener('click', () => m.close());
      passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin();
      });
    });
  }
};
