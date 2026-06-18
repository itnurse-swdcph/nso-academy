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
      foreground: '#000000', // แก้ไข 1: เปลี่ยนจาก #0D2B5E (สีกรมท่า) เป็นสีดำสนิทเพื่อ Contrast สูงสุด
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
    // แก้ไข 2: เพิ่มขอบขาว Margin (Quiet zone) รอบ QR Code จาก 20 เป็น 30 ให้เซ็นเซอร์กล้องสแกนง่ายขึ้น
    ctx.fillRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60); 
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX - 30, qrY - 30, qrSize + 60, qrSize + 60);
    
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
   * - ขอบแบบ Narrow, ฟอนต์ Sarabun สม่ำเสมอ
   * - จัดกลุ่มตามหน่วยงาน (ไม่มีแถวคั่นหน่วยงาน)
   * - รองรับหลายวัน: สร้างคอลัมน์ลายมือชื่อแยกตามจำนวนวันจริง
   * - หัวตารางพิมพ์ซ้ำทุกหน้า (thead { display: table-header-group })
   * @param {object} training  - { title, location, ... }
   * @param {object} session   - { sessionDate, sessionDates?, startTime, endTime, ... }
   * @param {Array}  registrations - รายชื่อผู้ลงทะเบียน
   */
  buildAttendanceHTML(training, session, registrations) {
    // ── 1. รวบรวมวันที่ทั้งหมดของรอบนี้ ──────────────────────────────
    // session.sessionDates คือ Array ของ YYYY-MM-DD (กรณีหลายวัน)
    // session.sessionDate  คือ string วันเดียว หรือ range "YYYY-MM-DD~YYYY-MM-DD"
    let sessionDays = [];

    if (Array.isArray(session.sessionDates) && session.sessionDates.length > 0) {
      sessionDays = session.sessionDates;
    } else if (session.sessionDate) {
      const raw = String(session.sessionDate);
      if (raw.includes('~')) {
        // ขยาย range เป็น array ของวัน
        const [startStr, endStr] = raw.split('~');
        const start = new Date(startStr.trim());
        const end   = new Date(endStr.trim());
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          sessionDays.push(d.toISOString().slice(0, 10));
        }
      } else {
        sessionDays = [raw.split('T')[0]];
      }
    }

    if (!sessionDays.length) sessionDays = [''];

    const isMultiDay = sessionDays.length > 1;

    // ── 2. สร้าง label วันที่แบบย่อ เช่น "29 มิ.ย. 68" ────────────────
    const dayLabels = sessionDays.map(d =>
      d ? this.dateInputToThai(d, 'short') : 'ลายมือชื่อ'
    );

    // ── 3. หัวข้อเอกสาร ──────────────────────────────────────────────
    const dateRangeStr = sessionDays.length > 1
      ? this.formatDateRange(sessionDays[0], sessionDays[sessionDays.length - 1], 'long')
      : (sessionDays[0] ? this.dateInputToThai(sessionDays[0], 'long') : '-');

    const timeStr = (session.startTime && session.endTime)
      ? `เวลา ${this.formatTime(session.startTime)} – ${this.formatTime(session.endTime)} น.`
      : '';

    // ── 4. จัดเรียงตามหน่วยงาน ──────────────────────────────────────
    const sorted = [...registrations].sort((a, b) =>
      (a.department || '').localeCompare(b.department || '', 'th')
    );

    // ── 5. สร้าง colspan สำหรับ header ──────────────────────────────
    // columns: ลำดับ | ชื่อ-นามสกุล | ตำแหน่ง | หน่วยงาน | [วันที่ 1] [วันที่ 2] ...
    const totalCols = 4 + sessionDays.length;

    // ── 6. สร้าง thead คอลัมน์ลายมือชื่อ ──────────────────────────
    const sigHeaders = dayLabels.map(label =>
      `<th style="width:${isMultiDay ? Math.floor(28 / sessionDays.length) : 28}%; padding:5px 4px; border:1px solid #000; text-align:center; font-size:9.5pt;">${label}</th>`
    ).join('');

    // ── 7. สร้าง tbody ─────────────────────────────────────────────
    let rows = '';
    let no = 1;
    sorted.forEach(reg => {
      // แถวรายชื่อ + ช่องเซ็นชื่อแต่ละวัน
      const sigCells = sessionDays.map(() =>
        `<td style="border:1px solid #000; padding:0; height:24px;"></td>`
      ).join('');

      rows += `
        <tr>
          <td style="text-align:center; padding:3px 3px; border:1px solid #000; font-size:9.5pt; white-space:nowrap;">${no++}</td>
          <td style="padding:3px 6px; border:1px solid #000; font-size:9.5pt;">${reg.fullName || '-'}</td>
          <td style="padding:3px 6px; border:1px solid #000; font-size:9pt;">${reg.position || '-'}</td>
          <td style="padding:3px 6px; border:1px solid #000; font-size:9pt;">${reg.department || '-'}</td>
          ${sigCells}
        </tr>`;
    });

    // ── 8. Render ────────────────────────────────────────────────
    return `
      <div style="font-family:'Sarabun',sans-serif; color:#000; background:#fff; font-size:9.5pt;">
        <style>
          @media print {
            @page {
              size: A4 ${isMultiDay && sessionDays.length > 2 ? 'landscape' : 'landscape'};
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 0 !important;
              margin: 0 !important;
              font-family: 'Sarabun', sans-serif !important;
              font-size: 9.5pt !important;
            }
            .att-table { page-break-inside: auto; }
            .att-table tr { page-break-inside: avoid; page-break-after: auto; }
            .att-table thead { display: table-header-group; }
            .att-table tfoot { display: table-footer-group; }
            .no-print { display: none !important; }
          }
          .att-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          .att-table th, .att-table td {
            border: 1px solid #000;
            font-family: 'Sarabun', sans-serif;
          }
          .doc-header {
            text-align: center;
            margin-bottom: 8px;
            font-family: 'Sarabun', sans-serif;
          }
          .doc-header h2 { font-size: 14pt; font-weight: bold; margin: 0 0 3px 0; }
          .doc-header h3 { font-size: 11pt; font-weight: normal; margin: 0 0 2px 0; }
          .doc-header p  { font-size: 10pt; margin: 0; }
        </style>

        <table class="att-table">
          <thead>
            <!-- ส่วนหัวเรื่อง — พิมพ์ซ้ำทุกหน้า -->
            <tr>
              <td colspan="${totalCols}" style="border:none; padding-bottom:8px;">
                <div class="doc-header">
                  <h2>แบบลงทะเบียนเข้าร่วมประชุม/อบรม</h2>
                  <h2>เรื่อง ${training.title || 'หัวข้อการอบรม'}</h2>
                  <h3>วันที่ ${dateRangeStr}${timeStr ? ' ' + timeStr : ''} ณ ${training.location || '-'}</h3>
                </div>
              </td>
            </tr>
            <!-- หัวคอลัมน์ -->
            <tr style="background:#d1d5db; font-weight:bold; text-align:center; font-size:9.5pt;">
              <th style="width:4%; padding:5px 3px; border:1px solid #000;">ลำดับ</th>
              <th style="width:24%; padding:5px 6px; border:1px solid #000; text-align:left;">ชื่อ – นามสกุล</th>
              <th style="width:${isMultiDay ? 18 : 20}%; padding:5px 6px; border:1px solid #000; text-align:left;">ตำแหน่ง</th>
              <th style="width:${isMultiDay ? 16 : 20}%; padding:5px 6px; border:1px solid #000; text-align:left;">หน่วยงาน/สังกัด</th>
              ${sigHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="${totalCols}" style="border:none; padding-top:8px; text-align:right; font-size:10pt; font-weight:bold;">
                รวมจำนวนผู้เข้าอบรมทั้งหมด: ${registrations.length} ท่าน
              </td>
            </tr>
          </tfoot>
        </table>
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
