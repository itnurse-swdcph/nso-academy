/**
 * pretest.js — Module 4.1: Pre-test Builder + Take Pre-test
 * สร้างข้อสอบ MCQ, upload image URL, คะแนนต่อข้อ, QR Code
 */

const PretestPage = {
  _questions: [],
  _trainingId: null,
  _trainingTitle: null,
  _mode: 'build', // 'build' | 'take'

  async render(container, params) {
    const currentTopic = Utils.currentTrainingTopic.get();
    this._trainingId = params.id || currentTopic?.id || '';
    this._trainingTitle = params.title || (currentTopic?.id === this._trainingId ? currentTopic.name : '') || '';
    this._mode = params.mode || 'build';
    this._questions = [];

    if (this._trainingId && this._mode === 'build' && !this._trainingTitle) {
      await this._ensureTrainingTitle();
    }

    if (this._mode === 'take') {
      this._renderTakeTest(container);
    } else {
      this._renderBuilder(container);
    }
  },

  // ─── Builder Mode ────────────────────────────────────────────
  _renderBuilder(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4);">
          <div>
            <h1 class="page-title"><i class="fa-solid fa-file-circle-question"></i> Pre-test Builder</h1>
            <p class="page-subtitle">หัวข้ออบรม: <strong>${this._trainingTitle || '(ยังไม่ได้เลือกหัวข้อ)'}</strong></p>
            <p class="page-subtitle">รหัสอบรม: ${this._trainingId || '(ยังไม่ได้เลือก)'}</p>
          </div>
          <div style="display:flex; gap:var(--space-3); align-items:flex-start; flex-wrap:wrap;">
            <button class="btn btn-outline-teal btn-sm" id="loadExistingBtn">📥 โหลดข้อสอบเดิม</button>
            <button class="btn btn-primary" id="saveQuestionsBtn">💾 บันทึกข้อสอบ</button>
          </div>
        </div>

        ${!this._trainingId ? `
          <div class="alert alert-warning" style="margin-bottom: var(--space-5);">
            <span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
            <div class="alert-content">
              <div class="alert-title">ไม่ได้เลือกหัวข้ออบรม</div>
              กรุณาเข้าผ่านระบบบริหารจัดการ หรือระบุ ID ด้านล่างนี้
            </div>
          </div>
          <div class="form-group" style="max-width:360px; margin-bottom:var(--space-5);">
            <label class="form-label">รหัสการอบรม</label>
            <div style="display:flex; gap:var(--space-2);">
              <input type="text" id="manualTrainingId" class="form-control" placeholder="TRN-XXXXXX">
              <button class="btn btn-teal" id="setTrainingIdBtn">ตั้งค่า</button>
            </div>
          </div>
        ` : ''}

        <!-- Questions Container -->
        <div id="questionsContainer" class="questions-container"></div>

        <!-- Add Question Button -->
        <button class="add-session-btn" id="addQuestionBtn" style="margin-top:var(--space-2);">
          <i class="fa-solid fa-plus"></i> เพิ่มข้อสอบ
        </button>

        <!-- QR Code Result -->
        <div id="pretestQrPanel" class="result-panel hidden" style="margin-top:var(--space-6);">
          <div class="result-panel-title"><i class="fa-solid fa-circle-check text-success"></i> บันทึกข้อสอบสำเร็จ</div>
          <div style="display:flex; gap:var(--space-6); flex-wrap:wrap;">
            <div style="flex:1;">
              <div class="info-box">
                <div style="font-size:var(--text-sm); color:var(--gray-600);">
                  จำนวนข้อ: <strong id="qrQuestionCount">0</strong> ข้อ ·
                  คะแนนรวม: <strong id="qrTotalScore">0</strong> คะแนน
                </div>
              </div>
            </div>
            <div>
              <div class="qr-panel has-qr" style="width:260px;">
                <div class="qr-label"><i class="fa-solid fa-qrcode"></i> QR Code Pre-test</div>
                <div class="qr-canvas-wrapper">
                  <canvas id="pretestQRCanvas"></canvas>
                </div>
                <div class="qr-url" id="pretestQrUrl">—</div>
                <button class="btn btn-outline-navy btn-sm" style="margin-top:var(--space-2);"
                  onclick="PretestPage._downloadQR()"><i class="fa-solid fa-download"></i> ดาวน์โหลด QR Code</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind
    document.getElementById('addQuestionBtn').addEventListener('click', () => this._addQuestion());
    document.getElementById('saveQuestionsBtn').addEventListener('click', () => this._saveQuestions());
    document.getElementById('loadExistingBtn').addEventListener('click', () => this._loadExisting());
    document.getElementById('setTrainingIdBtn')?.addEventListener('click', () => {
      const id = document.getElementById('manualTrainingId').value.trim();
      if (id) { this._trainingId = id; this.render(container, { id }); }
    });

    // Add first question
    this._addQuestion();
    this._loadExisting({ silent: true, keepDefaultsOnEmpty: true });
  },

  async _ensureTrainingTitle() {
    if (!this._trainingId || this._trainingTitle) return this._trainingTitle;
    try {
      const training = await API.getTrainingById(this._trainingId);
      this._trainingTitle = training?.title || training?.name || '';
      if (this._trainingTitle) {
        Utils.currentTrainingTopic.set({ id: this._trainingId, name: this._trainingTitle });
      }
    } catch (e) {
      console.warn('[Pretest] Failed to load training title:', e);
    }
    return this._trainingTitle;
  },

  _showQRPanel(questions, testType = 'PRE') {
    const panel = document.getElementById('pretestQrPanel');
    if (!panel || !this._trainingId) return;
    const totalScore = questions.reduce((s, q) => s + (q.score || 0), 0);
    document.getElementById('qrQuestionCount').textContent = questions.length;
    document.getElementById('qrTotalScore').textContent = totalScore;

    const url = testType === 'POST'
      ? Utils.buildPosttestUrl(this._trainingId)
      : Utils.buildPretestUrl(this._trainingId);
    document.getElementById('pretestQrUrl').textContent = url;
    Utils.generateQR(document.getElementById('pretestQRCanvas'), url, 180);
    panel.classList.remove('hidden');
  },

  _addQuestion(data = null) {
    const container = document.getElementById('questionsContainer');
    const idx = this._questions.length;
    const id  = `q-${Date.now()}-${idx}`;

    const q = {
      id, questionText: '', imageUrl: '',
      optionA: '', optionB: '', optionC: '', optionD: '',
      correctAnswer: 'A', score: 1
    };
    if (data) Object.assign(q, data);
    this._questions.push(q);

    const card = document.createElement('div');
    card.className = 'question-card animate-fade-in';
    card.id = id;
    card.innerHTML = `
      <div class="question-card-header">
        <span class="question-number">ข้อที่ ${idx + 1}</span>
        <div style="display:flex; gap:var(--space-2);">
          <div class="form-group" style="flex-direction:row; align-items:center; gap:var(--space-2); margin-bottom:0;">
            <label style="font-size:var(--text-xs); color:var(--gray-500); white-space:nowrap;">คะแนน:</label>
            <input type="number" class="form-control q-score" value="${q.score}" min="0" max="100"
              style="width:60px; padding:4px 8px; font-size:var(--text-sm);">
          </div>
          <button class="btn btn-danger btn-sm" onclick="PretestPage._removeQuestion('${id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="question-card-body">
        <div class="form-group">
          <label class="form-label">คำถาม</label>
          <textarea class="form-control q-text" rows="2" placeholder="พิมพ์คำถาม...">${q.questionText}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">URL รูปภาพ (ถ้ามี)</label>
          <input type="url" class="form-control q-image" placeholder="https://drive.google.com/..." value="${q.imageUrl}">
        </div>
        <div class="test-options-grid">
          <div class="form-group">
            <label class="form-label"><span style="background:var(--navy-800);color:white;padding:1px 8px;border-radius:4px;font-size:var(--text-xs);">A</span> ตัวเลือก ก</label>
            <input type="text" class="form-control q-optA" placeholder="ตัวเลือก A" value="${q.optionA}">
          </div>
          <div class="form-group">
            <label class="form-label"><span style="background:var(--navy-800);color:white;padding:1px 8px;border-radius:4px;font-size:var(--text-xs);">B</span> ตัวเลือก ข</label>
            <input type="text" class="form-control q-optB" placeholder="ตัวเลือก B" value="${q.optionB}">
          </div>
          <div class="form-group">
            <label class="form-label"><span style="background:var(--navy-800);color:white;padding:1px 8px;border-radius:4px;font-size:var(--text-xs);">C</span> ตัวเลือก ค</label>
            <input type="text" class="form-control q-optC" placeholder="ตัวเลือก C" value="${q.optionC}">
          </div>
          <div class="form-group">
            <label class="form-label"><span style="background:var(--navy-800);color:white;padding:1px 8px;border-radius:4px;font-size:var(--text-xs);">D</span> ตัวเลือก ง</label>
            <input type="text" class="form-control q-optD" placeholder="ตัวเลือก D" value="${q.optionD}">
          </div>
        </div>
        <div style="margin-top:var(--space-4);">
          <label class="form-label">เฉลย (คำตอบที่ถูกต้อง)</label>
          <div class="correct-answer-select">
            ${['A','B','C','D'].map(opt => `
              <button type="button" class="correct-option-btn ${q.correctAnswer === opt ? 'selected' : ''}"
                data-opt="${opt}" onclick="PretestPage._selectAnswer('${id}', '${opt}')">
                ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
    this._updateQuestionNumbers();
  },

  _selectAnswer(qId, opt) {
    const q = this._questions.find(q => q.id === qId);
    if (q) q.correctAnswer = opt;
    const card = document.getElementById(qId);
    card?.querySelectorAll('.correct-option-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-opt') === opt);
    });
  },

  _removeQuestion(qId) {
    const idx = this._questions.findIndex(q => q.id === qId);
    if (idx !== -1) this._questions.splice(idx, 1);
    document.getElementById(qId)?.remove();
    this._updateQuestionNumbers();
  },

  _updateQuestionNumbers() {
    document.querySelectorAll('.question-card .question-number').forEach((el, i) => {
      el.textContent = `ข้อที่ ${i + 1}`;
    });
  },

  _collectQuestions() {
    const container = document.getElementById('questionsContainer');
    return this._questions.map((q, i) => {
      const card = document.getElementById(q.id);
      if (!card) return null;
      return {
        ...q,
        order: i + 1,
        questionText: card.querySelector('.q-text')?.value.trim() || '',
        imageUrl:     card.querySelector('.q-image')?.value.trim() || '',
        optionA:      card.querySelector('.q-optA')?.value.trim() || '',
        optionB:      card.querySelector('.q-optB')?.value.trim() || '',
        optionC:      card.querySelector('.q-optC')?.value.trim() || '',
        optionD:      card.querySelector('.q-optD')?.value.trim() || '',
        score: parseFloat(card.querySelector('.q-score')?.value || 1)
      };
    }).filter(Boolean);
  },

  async _saveQuestions() {
    if (!this._trainingId) { UI.error('กรุณาระบุรหัสการอบรมก่อน'); return; }

    const questions = this._collectQuestions();
    if (!questions.length) { UI.warning('กรุณาเพิ่มข้อสอบอย่างน้อย 1 ข้อ'); return; }

    const invalid = questions.some(q => !q.questionText || !q.optionA || !q.optionB);
    if (invalid) { UI.error('กรุณากรอกคำถามและตัวเลือกให้ครบถ้วน'); return; }

    const btn = document.getElementById('saveQuestionsBtn');
    UI.setButtonLoading(btn, true, 'กำลังบันทึก...');

    try {
      await API.saveQuestions(this._trainingId, 'PRE', questions);
      this._showQRPanel(questions, 'PRE');
      document.getElementById('pretestQrPanel').scrollIntoView({ behavior: 'smooth' });
      UI.success(`บันทึก ${questions.length} ข้อสอบสำเร็จ!`);

    } catch (err) {
      UI.error('ไม่สามารถบันทึกข้อสอบ: ' + err.message);
    } finally {
      UI.setButtonLoading(btn, false);
    }
  },

  async _loadExisting(options = {}) {
    if (!this._trainingId) { UI.error('กรุณาระบุรหัสการอบรมก่อน'); return; }
    try {
      const existing = await API.getQuestions(this._trainingId, 'PRE');
      if (!existing?.length) {
        if (!options.silent) UI.info('ยังไม่มีข้อสอบสำหรับการอบรมนี้');
        return;
      }

      this._questions = [];
      document.getElementById('questionsContainer').innerHTML = '';
      existing.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(q => this._addQuestion(q));
      this._showQRPanel(existing, 'PRE');
      if (!options.silent) UI.success(`โหลด ${existing.length} ข้อสอบเรียบร้อย`);
    } catch (err) {
      if (!options.silent) UI.error('ไม่สามารถโหลดข้อสอบ: ' + err.message);
    }
  },

  async _downloadQR(testType = 'PRE') {
    if (!this._trainingId) return;
    await this._ensureTrainingTitle();
    const header = testType === 'POST'
      ? 'แบบทดสอบหลังอบรม (Post-test)'
      : 'แบบทดสอบก่อนอบรม (Pre-test)';
    const url = testType === 'POST'
      ? Utils.buildPosttestUrl(this._trainingId)
      : Utils.buildPretestUrl(this._trainingId);
    Utils.downloadTrainingQRCard(
      header,
      this._trainingTitle || this._trainingId,
      url,
      `QR_${testType}_${Utils.safeFilename(this._trainingTitle || this._trainingId)}`
    );
  },

  // ─── Take Test Mode ──────────────────────────────────────────
  async _renderTakeTest(container) {
    if (!this._trainingId) {
      UI.showError(container, 'ไม่พบรหัสการอบรม กรุณาสแกน QR Code ใหม่');
      return;
    }

    UI.showPageLoader(container);

    try {
      const [questions, participants] = await Promise.all([
        API.getQuestions(this._trainingId, 'PRE'),
        API.getParticipants()
      ]);

      if (!questions?.length) {
        UI.showEmpty(container, { icon: '<i class="fa-solid fa-file-circle-question"></i>', title: 'ยังไม่มีข้อสอบ', desc: 'ผู้ดูแลยังไม่ได้สร้างข้อสอบ Pre-test' });
        return;
      }

      this._renderTestForm(container, questions, participants || [], 'PRE');
    } catch (err) {
      UI.showError(container, err.message);
    }
  },

  _renderTestForm(container, questions, participants, type) {
    const totalScore = questions.reduce((s, q) => s + (q.score || 1), 0);
    container.innerHTML = `
      <div class="register-page-wrapper animate-fade-in">
        <div class="training-info-banner">
          <div class="training-info-title">${type === 'PRE' ? '<i class="fa-solid fa-file-circle-question"></i> Pre-test' : '<i class="fa-solid fa-file-lines"></i> Post-test'} — ทำแบบทดสอบ</div>
          <div class="training-info-meta">
            <div class="training-meta-item"><i class="fa-solid fa-chart-column"></i> ${questions.length} ข้อ · รวม ${totalScore} คะแนน</div>
          </div>
        </div>
        <div class="register-card">
          <div class="form-group" style="margin-bottom: var(--space-6);">
            <label class="form-label">ชื่อ-นามสกุล <span class="required">*</span></label>
            <div class="autocomplete-wrapper">
              <input type="text" id="testNameSearch" class="form-control" placeholder="พิมพ์ชื่อเพื่อค้นหา..." autocomplete="off">
              <div id="testAutocomplete" class="autocomplete-dropdown"></div>
            </div>
            <input type="hidden" id="testParticipantId">
          </div>
          <form id="testForm">
            ${questions.map((q, i) => `
              <div class="question-card" style="margin-bottom:var(--space-4);">
                <div class="question-card-header">
                  <span class="question-number">ข้อ ${i + 1}</span>
                  <span style="font-size:var(--text-xs); color:var(--gray-500);">${q.score || 1} คะแนน</span>
                </div>
                <div class="question-card-body">
                  <p style="font-size:var(--text-base); font-weight:var(--fw-medium); margin-bottom:var(--space-4);">${q.questionText}</p>
                  ${q.imageUrl ? `<img src="${q.imageUrl}" alt="รูปประกอบ" style="max-width:100%; border-radius:var(--radius-lg); margin-bottom:var(--space-4);">` : ''}
                  ${['A','B','C','D'].filter(opt => q['option'+opt]).map(opt => `
                    <label class="form-check" style="margin-bottom:var(--space-2); border:1.5px solid var(--gray-200); border-radius:var(--radius-lg); padding:var(--space-3);">
                      <input type="radio" name="q_${q.questionId || i}" value="${opt}" required>
                      <span class="form-check-label"><strong>${opt}.</strong> ${q['option'+opt]}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            <button type="submit" class="btn btn-primary btn-lg btn-block" id="submitTestBtn">
              📤 ส่งคำตอบ
            </button>
          </form>
        </div>
      </div>
    `;

    // Autocomplete
    const dSearch = Utils.debounce((q) => {
      const res = participants.filter(p => Utils.matchesSearch(p.fullName, q)).slice(0, 8);
      const dd = document.getElementById('testAutocomplete');
      dd.innerHTML = res.length
        ? res.map(p => `<div class="autocomplete-item" data-id="${p.participantId}">${p.fullName}</div>`).join('')
        : `<div class="autocomplete-no-results">ไม่พบ "${q}"</div>`;
      dd.classList.add('show');
      dd.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', () => {
          document.getElementById('testNameSearch').value = item.textContent;
          document.getElementById('testParticipantId').value = item.getAttribute('data-id');
          dd.classList.remove('show');
        });
      });
    }, 300);

    document.getElementById('testNameSearch').addEventListener('input', e => {
      if (e.target.value.length >= 2) dSearch(e.target.value);
    });

    document.getElementById('testForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const participantId = document.getElementById('testParticipantId').value;
      const fullName = document.getElementById('testNameSearch').value.trim();
      if (!fullName) { UI.error('กรุณาระบุชื่อ-นามสกุล'); return; }

      const answers = questions.map((q, i) => {
        const name = `q_${q.questionId || i}`;
        const selected = document.querySelector(`input[name="${name}"]:checked`);
        return { questionId: q.questionId, selectedAnswer: selected?.value || '', testType: type };
      });

      const unanswered = answers.filter(a => !a.selectedAnswer).length;
      if (unanswered > 0) {
        const ok = await UI.confirm(`มีคำถามที่ยังไม่ตอบ ${unanswered} ข้อ ต้องการส่งคำตอบหรือไม่?`, 'ส่งต่อไป', 'primary');
        if (!ok) return;
      }

      const btn = document.getElementById('submitTestBtn');
      UI.setButtonLoading(btn, true, 'กำลังส่ง...');
      try {
        const result = await API.submitAnswers({
          trainingId: this._trainingId, testType: type,
          participantId: participantId || 'MANUAL', fullName, answers
        });
        container.innerHTML = `
          <div class="register-page-wrapper">
            <div class="success-page animate-scale-in">
              <div class="success-icon"><i class="fa-solid fa-circle-check text-success"></i></div>
              <h2 class="success-title">ส่งคำตอบสำเร็จ!</h2>
              <p class="success-subtitle">${fullName}</p>
              <div class="stat-card" style="display:inline-flex; max-width:280px; margin-bottom:var(--space-6);">
                <div class="stat-icon teal"><i class="fa-solid fa-chart-column"></i></div>
                <div class="stat-info">
                  <div class="stat-value">${result.score}/${result.maxScore}</div>
                  <div class="stat-label">คะแนนที่ได้</div>
                </div>
              </div>
              <a href="#/" class="btn btn-ghost"><i class="fa-solid fa-house"></i> กลับหน้าหลัก</a>
            </div>
          </div>
        `;
      } catch (err) {
        UI.error('ไม่สามารถส่งคำตอบ: ' + err.message);
        UI.setButtonLoading(btn, false);
      }
    });
  },

  cleanup() {
    this._questions = [];
    this._trainingId = null;
    this._trainingTitle = null;
  }
};
