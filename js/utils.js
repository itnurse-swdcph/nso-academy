/**
 * utils.js — Utility Functions
 * Thai date, ID generation, QR code, Excel/PDF export, debounce
 */

const Utils = {
  // ── Thai Buddhist Era Date ───────────────────────────────────
  THAI_MONTHS: [
    'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
  ],
  THAI_MONTHS_SHORT: [
    'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
  ],
  THAI_DAYS: ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'],

  /**
   * แปลงวันที่เป็นรูปแบบไทย พ.ศ.
   * @param {Date|string} date
   * @param {'long'|'short'|'datetime'|'time'} format
   */
  thaiDate(date, format = 'long') {
    if (!date) return '-';
    if (typeof date === 'string' && date.includes('~')) {
      const [start, end] = date.split('~');
      return this.formatDateRange(start, end, format);
    }
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
      const str = String(date);
      if (str.includes('~')) {
        const [start, end] = str.split('~');
        return this.formatDateRange(start, end, format);
      }
      return String(date);
    }

    // Shift timestamp to Thailand Standard Time (ICT, UTC+7)
    const ictTime = d.getTime() + 7 * 60 * 60 * 1000;
    const ictDate = new Date(ictTime);

    const day   = ictDate.getUTCDate();
    const month = ictDate.getUTCMonth();
    const year  = ictDate.getUTCFullYear() + 543; // แปลง ค.ศ. → พ.ศ.
    const hours = String(ictDate.getUTCHours()).padStart(2, '0');
    const mins  = String(ictDate.getUTCMinutes()).padStart(2, '0');

    if (format === 'long')     return `${day} ${this.THAI_MONTHS[month]} ${year}`;
    if (format === 'short')    return `${day} ${this.THAI_MONTHS_SHORT[month]} ${year}`;
    if (format === 'datetime') return `${day} ${this.THAI_MONTHS[month]} ${year} เวลา ${hours}:${mins} น.`;
    if (format === 'time')     return `${hours}:${mins} น.`;
    if (format === 'numeric')  return `${String(day).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`;

    return `${day} ${this.THAI_MONTHS[month]} ${year}`;
  },

  /** วันนี้ในรูปแบบไทย */
  today(format = 'long') { return this.thaiDate(new Date(), format); },

  /** แปลงค่า input[type=date] (YYYY-MM-DD) หรือ ISO string เป็น Thai date */
  dateInputToThai(dateStr, format = 'long') {
    if (!dateStr) return '-';
    const str = String(dateStr);
    
    // If it is a date range string (contains '~')
    if (str.includes('~')) {
      const [start, end] = str.split('~');
      return this.formatDateRange(start, end, format);
    }
    
    // If it is an ISO/DateTime string (contains 'T' or 'Z')
    if (str.includes('T') || str.includes('Z')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const ictTime = d.getTime() + 7 * 60 * 60 * 1000;
        const ictDate = new Date(ictTime);
        const day = ictDate.getUTCDate();
        const month = ictDate.getUTCMonth();
        const year = ictDate.getUTCFullYear() + 543;
        if (format === 'short')   return `${day} ${this.THAI_MONTHS_SHORT[month]} ${year}`;
        if (format === 'numeric') return `${String(day).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`;
        return `${day} ${this.THAI_MONTHS[month]} ${year}`;
      }
    }

    // Otherwise treat as plain date input (YYYY-MM-DD)
    const cleanDateStr = str.split(' ')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length < 3) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const ictTime = d.getTime() + 7 * 60 * 60 * 1000;
        const ictDate = new Date(ictTime);
        const day = ictDate.getUTCDate();
        const month = ictDate.getUTCMonth();
        const year = ictDate.getUTCFullYear() + 543;
        if (format === 'short')   return `${day} ${this.THAI_MONTHS_SHORT[month]} ${year}`;
        if (format === 'numeric') return `${String(day).padStart(2,'0')}/${String(month+1).padStart(2,'0')}/${year}`;
        return `${day} ${this.THAI_MONTHS[month]} ${year}`;
      }
      return String(dateStr);
    }
    const [y, m, d] = parts.map(Number);
    const thaiYear = y + 543;
    if (format === 'short')   return `${d} ${this.THAI_MONTHS_SHORT[m-1]} ${thaiYear}`;
    if (format === 'numeric') return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${thaiYear}`;
    return `${d} ${this.THAI_MONTHS[m-1]} ${thaiYear}`;
  },

  /** แปลงช่วงวันที่ (YYYY-MM-DD) เป็นรูปแบบไทย */
  formatDateRange(startStr, endStr, format = 'long') {
    if (!startStr) return '-';
    if (!endStr || startStr === endStr) {
      return this.dateInputToThai(startStr, format);
    }

    const startClean = String(startStr).includes('T') ? String(startStr).split('T')[0] : String(startStr);
    const endClean = String(endStr).includes('T') ? String(endStr).split('T')[0] : String(endStr);

    const startParts = startClean.split('-');
    const endParts = endClean.split('-');

    if (startParts.length < 3 || endParts.length < 3) {
      return `${this.dateInputToThai(startStr, format)} - ${this.dateInputToThai(endStr, format)}`;
    }

    const [sY, sM, sD] = startParts.map(Number);
    const [eY, eM, eD] = endParts.map(Number);

    const startYearThai = sY + 543;
    const endYearThai = eY + 543;

    if (startYearThai === endYearThai) {
      if (sM === eM) {
        // Same month and year: "30-31 มิถุนายน 2569"
        const monthName = format === 'short' ? this.THAI_MONTHS_SHORT[sM-1] : this.THAI_MONTHS[sM-1];
        return `${sD}-${eD} ${monthName} ${startYearThai}`;
      } else {
        // Different months, same year: "30 มิถุนายน - 1 กรกฎาคม 2569"
        const startMonthName = format === 'short' ? this.THAI_MONTHS_SHORT[sM-1] : this.THAI_MONTHS[sM-1];
        const endMonthName = format === 'short' ? this.THAI_MONTHS_SHORT[eM-1] : this.THAI_MONTHS[eM-1];
        return `${sD} ${startMonthName} - ${eD} ${endMonthName} ${startYearThai}`;
      }
    } else {
      // Different years: "30 มิถุนายน 2569 - 1 มกราคม 2570"
      return `${this.dateInputToThai(startStr, format)} - ${this.dateInputToThai(endStr, format)}`;
    }
  },

  /** แปลงเวลา (hh:mm หรือ ISO string) เป็น hh.mm */
  formatTime(timeStr) {
    if (!timeStr) return '-';
    if (String(timeStr).includes('T')) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        // If it represents a time value in 1899 (Google Sheets default epoch for times)
        // Thailand historical timezone offset was +6:42:04 (24124000 ms)
        const isHistorical = String(timeStr).includes('1899');
        const offset = isHistorical ? 24124000 : 7 * 60 * 60 * 1000;
        const ictTime = d.getTime() + offset;
        const ictDate = new Date(ictTime);
        const hours = String(ictDate.getUTCHours()).padStart(2, '0');
        const mins  = String(ictDate.getUTCMinutes()).padStart(2, '0');
        return `${hours}.${mins}`;
      }
    }
    const parts = String(timeStr).split(':');
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, '0');
      const mins  = parts[1].padStart(2, '0');
      return `${hours}.${mins}`;
    }
    return String(timeStr);
  },

  /** แปลง Thai date string เป็น ISO date string สำหรับ input[type=date] */
  thaiYearToInput(thaiYear) {
    return String(Number(thaiYear) - 543);
  },

  // ── ID Generators ────────────────────────────────────────────
  /**
   * สร้าง unique ID
   * @param {string} prefix - เช่น 'TRN', 'SES', 'REG'
   */
  generateId(prefix = 'ID') {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  },

  /** สร้าง management code 6 ตัวอักษรตัวเลข */
  generateCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ตัดตัวอักษรที่สับสน
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  generateQR(canvas, text, size = 220) {
    if (typeof QRious === 'undefined') {
      console.warn('[Utils] QRious library not loaded');
      return;
    }
    new QRious({
      element: canvas,
      value: text,
      size,
      foreground: '#0D2B5E',
      background: '#FFFFFF',
      level: 'H' // High error correction
    });
  },

  /**
   * ดาวน์โหลดภาพ QR Code เปล่าๆ
   */
  downloadRawQR(url, filename = 'qr-code') {
    if (typeof QRious === 'undefined') {
      console.warn('[Utils] QRious library not loaded');
      return;
    }
    const tempCanvas = document.createElement('canvas');
    new QRious({
      element: tempCanvas,
      value: url,
      size: 400,
      foreground: '#0D2B5E',
      background: '#FFFFFF',
      level: 'H'
    });
    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    a.click();
  },

  /**
   * ดาวน์โหลดการ์ดลงทะเบียนแบบสวยงาม
   */
  downloadQRCard(title, url, filename = 'registration-card') {
    if (typeof QRious === 'undefined') {
      console.warn('[Utils] QRious library not loaded');
      return;
    }
    const width = 800;
    const height = 1100;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Background & Border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Elegant navy border frame
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#0D2B5E';
    ctx.strokeRect(15, 15, width - 30, height - 30);

    // Inner gold/teal accent line
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00897b';
    ctx.strokeRect(27, 27, width - 54, height - 54);

    // Header Background
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(30, 30, width - 60, 200);
    ctx.fillStyle = '#0D2B5E';
    ctx.fillRect(30, 228, width - 60, 4);

    // 2. Text styling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Hospital Header Text
    ctx.fillStyle = '#00897b';
    ctx.font = 'bold 20px "Sarabun", "Prompt", sans-serif';
    ctx.fillText('ภารกิจด้านการพยาบาล โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน', width / 2, 80);

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = '500 18px "Sarabun", "Prompt", sans-serif';
    ctx.fillText('NSO ACADEMY TRAINING REGISTRATION', width / 2, 115);

    // Course Title text-wrapping
    ctx.fillStyle = '#0D2B5E';
    ctx.font = 'bold 32px "Prompt", "Sarabun", sans-serif';
    
    // Wrap title
    const maxTextWidth = width - 120;
    const cleanTitle = title.replace(/\s+/g, ' ');
    let lines = [];
    if (ctx.measureText(cleanTitle).width <= maxTextWidth) {
      lines.push(cleanTitle);
    } else {
      let currentIdx = 0;
      while (currentIdx < cleanTitle.length) {
        let chunkLength = 28;
        let chunk = cleanTitle.substring(currentIdx, currentIdx + chunkLength);
        lines.push(chunk);
        currentIdx += chunkLength;
      }
    }

    // Draw wrapped lines (maximum 2 lines to fit)
    const titleY = 165;
    if (lines.length === 1) {
      ctx.fillText(lines[0], width / 2, titleY);
    } else {
      ctx.fillText(lines[0], width / 2, titleY - 20);
      ctx.fillText(lines[1] + (lines[2] ? '...' : ''), width / 2, titleY + 20);
    }

    // 3. QR Code generation & drawing
    const qrSize = 400;
    const qrCanvas = document.createElement('canvas');
    new QRious({
      element: qrCanvas,
      value: url,
      size: qrSize,
      foreground: '#0D2B5E',
      background: '#FFFFFF',
      level: 'H'
    });

    const qrX = (width - qrSize) / 2;
    const qrY = 320;
    
    // QR Shadow/Card frame
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 4. CTA Footer Section
    ctx.fillStyle = '#0D2B5E';
    ctx.font = 'bold 36px "Prompt", "Sarabun", sans-serif';
    ctx.fillText('สแกนเพื่อลงทะเบียน', width / 2, 820);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 20px "Sarabun", "Prompt", sans-serif';
    ctx.fillText('Scan this QR code to join the training session', width / 2, 875);

    // Decorative footer bar
    ctx.fillStyle = '#00897b';
    ctx.fillRect(100, 930, width - 200, 3);

    // System name footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Sarabun", "Prompt", sans-serif';
    ctx.fillText('ระบบบริหารจัดการการศึกษาและฝึกอบรมกลุ่มภารกิจด้านการพยาบาล', width / 2, 970);
    ctx.fillText('NSO ACADEMY © 2026', width / 2, 995);

    // Trigger download
    const cardDataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = cardDataUrl;
    a.download = `${filename}.png`;
    a.click();
  },

  /** สร้าง Registration URL */
  buildRegisterUrl(trainingId) {
    const base = window.location.href.split('#')[0];
    return `${base}#/register?id=${trainingId}`;
  },

  /** สร้าง Pre-test URL */
  buildPretestUrl(trainingId) {
    const base = window.location.href.split('#')[0];
    return `${base}#/take-test?id=${trainingId}&type=PRE`;
  },

  /** สร้าง Post-test URL */
  buildPosttestUrl(trainingId) {
    const base = window.location.href.split('#')[0];
    return `${base}#/take-test?id=${trainingId}&type=POST`;
  },

  // ── Excel Export (SheetJS) ───────────────────────────────────
  /**
   * Export ข้อมูลเป็นไฟล์ Excel
   * @param {Array<object>} data - array of objects
   * @param {string} filename - ชื่อไฟล์ (ไม่ต้องใส่ .xlsx)
   * @param {object} [options] - { sheetName, headers }
   */
  exportExcel(data, filename, options = {}) {
    if (typeof XLSX === 'undefined') {
      UI.error('ไม่สามารถโหลด SheetJS library ได้');
      return;
    }

    const sheetName = options.sheetName || 'ข้อมูล';
    const wb = XLSX.utils.book_new();

    // ถ้ามี custom headers ให้ใช้
    let wsData = data;
    if (options.headers) {
      const rows = data.map(row => options.headers.map(h => row[h.key] ?? ''));
      wsData = [options.headers.map(h => h.label), ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    } else {
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  // ── PDF via Print ─────────────────────────────────────────────
  /**
   * Print to PDF: inject HTML into print area and trigger print
   * ใช้ @media print CSS — รองรับภาษาไทยโดยอัตโนมัติ
   * @param {string} html - HTML content
   * @param {string} [title] - document title
   */
  printPDF(html, title = 'เอกสาร') {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    const prevTitle = document.title;
    document.title = title;
    printArea.innerHTML = html;
    document.body.classList.add('printing-mode');
    printArea.classList.remove('hidden');

    window.print();

    // Restore after print
    setTimeout(() => {
      document.title = prevTitle;
      printArea.innerHTML = '';
      printArea.classList.add('hidden');
      document.body.classList.remove('printing-mode');
    }, 1000);
  },

  /**
   * สร้าง HTML สำหรับใบเซ็นชื่อ (เอกสารราชการสไตล์ไทย)
   */
  buildAttendanceHTML(training, session, registrations) {
    const sessionDateStr = session.sessionDate
      ? Utils.thaiDate(session.sessionDate, 'long')
      : Utils.dateInputToThai(session.sessionDateRaw, 'long');

    // จัดเรียงตามหน่วยงาน
    const sorted = [...registrations].sort((a, b) =>
      (a.department || '').localeCompare(b.department || '', 'th')
    );

    let rows = '';
    let no = 1;
    let lastDept = null;
    sorted.forEach(reg => {
      if (reg.department !== lastDept) {
        rows += `
          <tr>
            <td colspan="5" style="background:#e8e8e8; font-weight:700; font-size:11pt; padding:6pt 8pt;">
              หน่วยงาน: ${reg.department || '-'}
            </td>
          </tr>`;
        lastDept = reg.department;
      }
      rows += `
        <tr>
          <td style="text-align:center;">${no++}</td>
          <td>${reg.fullName || '-'}</td>
          <td>${reg.position || '-'}</td>
          <td>${reg.department || '-'}</td>
          <td style="text-align:center;">&nbsp;</td>
        </tr>`;
    });

    return `
      <div class="print-doc">
        <div class="print-doc-header">
          <div class="print-doc-title">${training.title || 'หัวข้อการอบรม'}</div>
          <div class="print-doc-subtitle">
            วันที่ ${sessionDateStr} &nbsp;|&nbsp;
            เวลา ${Utils.formatTime(session.startTime)} – ${Utils.formatTime(session.endTime)} น. &nbsp;|&nbsp;
            สถานที่ ${training.location || '-'}
          </div>
        </div>
        <table class="print-table" width="100%">
          <thead>
            <tr>
              <th style="width:40pt; text-align:center;">ที่</th>
              <th>ชื่อ-นามสกุล</th>
              <th style="width:120pt;">ตำแหน่ง</th>
              <th style="width:130pt;">หน่วยงาน</th>
              <th class="signature-col" style="text-align:center;">ลายมือชื่อ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20pt; font-size:11pt; color:#666;">
          จำนวนผู้เข้าอบรมทั้งหมด: ${registrations.length} ท่าน
        </div>
      </div>
    `;
  },

  // ── Debounce ─────────────────────────────────────────────────
  /**
   * Debounce function — ป้องกันการเรียกฟังก์ชันบ่อยเกินไป
   * @param {Function} fn
   * @param {number} ms - delay in milliseconds
   */
  debounce(fn, ms = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  },

  // ── String Helpers ───────────────────────────────────────────
  /** ค้นหาข้อความแบบ fuzzy (กรณีไม่ตรงตามตัวพิมพ์) */
  matchesSearch(text, query) {
    if (!query) return true;
    return String(text).toLowerCase().includes(String(query).toLowerCase());
  },

  /** ตัดข้อความยาว */
  truncate(text, maxLength = 50) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  },

  // ── Clipboard ─────────────────────────────────────────────────
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      UI.success('คัดลอกแล้ว!', 'คัดลอกสำเร็จ');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      UI.success('คัดลอกแล้ว!', 'คัดลอกสำเร็จ');
    }
  },

  // ── Score Color ───────────────────────────────────────────────
  scorePillClass(score, max = 100) {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 70) return 'high';
    if (pct >= 50) return 'mid';
    return 'low';
  },

  // ── Local Storage Helpers ─────────────────────────────────────
  storage: {
    get(key, fallback = null) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { console.warn('[Storage] Failed to write:', e); }
    },
    remove(key) { localStorage.removeItem(key); }
  }
};
