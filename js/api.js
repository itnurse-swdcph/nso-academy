/**
 * api.js — API Layer
 * Handles all communication with the GAS backend.
 * Uses POST with Content-Type: text/plain to avoid CORS preflight.
 */

const API_CONFIG = {
  // ⚠️ เปลี่ยนเป็น URL ของ GAS Web App หลังจาก Deploy
  URL: 'https://script.google.com/macros/s/AKfycbwMKKoi2YGuiJTIVdTg94lyWZsNtM1Njxm4LJCxjfkrvaV4OEf7uHpx1C9UQ6c8mfGW/exec',
  TIMEOUT: 30000,    // 30 วินาที
  RETRY_ATTEMPTS: 3, // จำนวนครั้งที่ retry เมื่อเกิด network error
  RETRY_DELAY: 1000  // milliseconds ระหว่าง retry
};

const ApiService = {
  /**
   * ส่ง request ไปยัง GAS backend
   * @param {string} action - ชื่อ action
   * @param {object} payload - ข้อมูลที่ส่ง
   * @param {number} attempt - ครั้งที่ retry (internal)
   * @returns {Promise<any>} ข้อมูลจาก GAS
   */
  async request(action, payload = null, attempt = 1) {
    // ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
    if (!navigator.onLine) {
      throw new Error('ไม่มีการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบการเชื่อมต่อ');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(API_CONFIG.URL, {
        method: 'POST',
        // text/plain หลีกเลี่ยง Preflight CORS request
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success === false || result.status === 'error') {
        throw new Error(result.message || result.error || 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์');
      }

      return result.data;

    } catch (err) {
      clearTimeout(timeoutId);

      // Retry สำหรับ network errors (ไม่ใช่ business logic errors)
      if (attempt < API_CONFIG.RETRY_ATTEMPTS && this._isNetworkError(err)) {
        console.warn(`[API] Retry attempt ${attempt}/${API_CONFIG.RETRY_ATTEMPTS} for action: ${action}`);
        await this._sleep(API_CONFIG.RETRY_DELAY * attempt);
        return this.request(action, payload, attempt + 1);
      }

      if (err.name === 'AbortError') {
        throw new Error('หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      }

      console.error(`[API] Error on action "${action}":`, err);
      throw err;
    }
  },

  /** ตรวจสอบว่าเป็น network error หรือไม่ */
  _isNetworkError(err) {
    return (
      err instanceof TypeError ||
      err.name === 'AbortError' ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError')
    );
  },

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ── API Action Shortcuts (readable interface) ─────────────────

const API = {
  // Trainings
  getTrainings: ()               => ApiService.request('getTrainings'),
  getTrainingById: (id)          => ApiService.request('getTrainingById', { trainingId: id }),
  createTraining: (data)         => ApiService.request('createTraining', data),
  getTrainingSessions: (id)      => ApiService.request('getTrainingSessions', { trainingId: id }),
  validateCode: (id, code)       => ApiService.request('validateManagementCode', { trainingId: id, code }),

  // Registrations
  register: (data)               => ApiService.request('register', data),
  getRegistrations: (sessionId)  => ApiService.request('getRegistrations', { sessionId }),
  getRegistrationsByTraining: (id) => ApiService.request('getRegistrationsByTraining', { trainingId: id }),

  // Participants (staff database)
  searchParticipants: (query)    => ApiService.request('searchParticipants', { query }),
  getParticipants: ()            => ApiService.request('getAllParticipants'),

  // Pre/Post Tests
  saveQuestions: (id, type, qs)  => ApiService.request('saveQuestions', { trainingId: id, testType: type, questions: qs }),
  getQuestions: (id, type)       => ApiService.request('getQuestions', { trainingId: id, testType: type }),
  submitAnswers: (data)          => ApiService.request('submitAnswers', data),
  getScores: (id)                => ApiService.request('getScores', { trainingId: id }),

  // Satisfaction
  saveSatisfactionForm: (id, qs) => ApiService.request('saveSatisfactionForm', { trainingId: id, questions: qs }),
  getSatisfactionForm: (id)      => ApiService.request('getSatisfactionForm', { trainingId: id }),
  submitSatisfaction: (data)     => ApiService.request('submitSatisfaction', data),

  // Analytics & Approval
  getAnalytics: (id)             => ApiService.request('getAnalytics', { trainingId: id }),
  approveParticipant: (regId)    => ApiService.request('approveParticipant', { regId }),
  rejectParticipant: (regId)     => ApiService.request('rejectParticipant', { regId }),

  // Export
  exportPDF: (sessionId)         => ApiService.request('exportAttendancePDF', { sessionId }),
  exportAnalyticsExcel: (id)     => ApiService.request('exportAnalyticsExcel', { trainingId: id }),

  // Setup (Admin)
  setupSpreadsheet: ()           => ApiService.request('setupSpreadsheet'),
  getSampleData: ()              => ApiService.request('getSampleData'),
};
