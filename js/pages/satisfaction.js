/**
 * satisfaction.js — Module 4.3: Satisfaction Evaluation Builder
 * สร้างแบบประเมินความพึงพอใจ (Rating 5 ระดับ + Text)
 */

const SatisfactionPage = {
  _trainingId: null,
  _questions: [],
  _mode: 'build', // 'build' | 'take'

  render(container, params) {
    this._trainingId = params.id || '';
    this._mode = params.mode || 'build';
    this._questions = [];

    if (this._mode === 'take') {
      this._renderTakeForm(container);
    } else {
      this._renderBuilder(container);
    }
  },

  _renderBuilder(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4);">
          <div>
            <h1 class="page-title"><i class="fa-solid fa-star"></i> แบบประเมินความพึงพอใจ</h1>
            <p class="page-subtitle">รหัสอบรม: ${this._trainingId || '(ยังไม่ได้เลือก)'}</p>
          </div>
          <div style="display:flex; gap:var(--space-3); align-items:flex-start; flex-wrap:wrap;">
            <button class="btn btn-outline-teal btn-sm" id="loadSatBtn">📥 โหลดแบบฟอร์มเดิม</button>
            <button class="btn btn-primary" id="saveSatBtn">💾 บันทึกแบบประเมิน</button>
          </div>
        </div>

        <!-- Add Question Toolbar -->
        <div class="card" style="margin-bottom:var(--space-5);">
          <div class="card-body" style="display:flex; gap:var(--space-3); flex-wrap:wrap; align-items:center;">
            <span style="font-size:var(--text-sm); font-weight:var(--fw-semi); color:var(--gray-600);">เพิ่มคำถาม:</span>
            <button class="btn btn-outline-teal btn-sm" id="addRatingBtn"><i class="fa-solid fa-star"></i> คำถามประเมินคะแนน (1-5)</button>
            <button class="btn btn-outline-navy btn-sm" id="addTextBtn"><i class="fa-solid fa-comment"></i> คำถามแบบพิมพ์ข้อความ</button>
            <div style="margin-left:auto; font-size:var(--text-xs); color:var(--gray-400);" id="satQuestionCount">0 คำถาม</div>
          </div>
        </div>

        <!-- Questions List -->
        <div id="satQuestionsContainer"></div>

        <!-- QR Result -->
        <div id="satQrPanel" class="result-panel hidden" style="margin-top:var(--space-6);">
          <div class="result-panel-title"><i class="fa-solid fa-circle-check text-success"></i> บันทึกแบบประเมินสำเร็จ!</div>
          <div style="display:flex; gap:var(--space-6); flex-wrap:wrap;">
            <div style="flex:1;">
              <div class="info-box">
                <div id="satSummary" style="font-size:var(--text-sm); color:var(--gray-600);"></div>
              </div>
            </div>
            <div class="qr-panel has-qr" style="width:260px;">
              <div class="qr-label"><i class="fa-solid fa-qrcode"></i> QR Code แบบประเมิน</div>
              <div class="qr-canvas-wrapper"><canvas id="satQRCanvas"></canvas></div>
              <div class="qr-url" id="satQrUrl">—</div>
              <button class="btn btn-outline-navy btn-sm" style="margin-top:var(--space-2);"
                onclick="SatisfactionPage._downloadQR()"><i class="fa-solid fa-download"></i> บันทึก QR</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Bind
    document.getElementById('addRatingBtn').addEventListener('click', () => this._addQuestion('RATING'));
    document.getElementById('addTextBtn').addEventListener('click', () => this._addQuestion('TEXT'));
    document.getElementById('saveSatBtn').addEventListener('click', () => this._saveForm());
    document.getElementById('loadSatBtn').addEventListener('click', () => this._loadExisting());

    // Default questions - ตั้งค่าเริ่มต้น 6 ข้อประเมินคะแนน + ข้อเสนอแนะ
    this._addQuestion('RATING', { 
      questionText: '1. ด้านวิทยากร: ความรู้ความสามารถของวิทยากรในการถ่ายทอดเนื้อหาการอบรม',
      isRequired: true 
    });
    this._addQuestion('RATING', { 
      questionText: '2. ด้านเนื้อหา: เนื้อหามีความเหมาะสม',
      isRequired: true 
    });
    this._addQuestion('RATING', { 
      questionText: '3. ด้านการนำไปใช้ประโยชน์: สามารถนำความรู้ไปพัฒนางาน และประยุกต์ใช้ในการทำงาน',
      isRequired: true 
    });
    this._addQuestion('RATING', { 
      questionText: '4. สถานที่และระยะเวลาอบรมมีความเหมาะสม',
      isRequired: true 
    });
    this._addQuestion('RATING', { 
      questionText: '5. ด้านบริการ: ความเหมาะสมของอาหารและเครื่องดื่ม',
      isRequired: true 
    });
    this._addQuestion('RATING', { 
      questionText: '6. ภาพรวม: ความพึงพอใจในภาพรวมต่อการอบรมครั้งนี้',
      isRequired: true 
    });
    this._addQuestion('TEXT', { 
      questionText: '7. ข้อเสนอแนะเพิ่มเติม (ระบุ)',
      isRequired: false 
    });
  },

  _addQuestion(type, data = {}) {
    const id = `sat-${Date.now()}-${this._questions.length}`;
    const q = {
      id,
      questionType: type,
      questionText: data.questionText || '',
      isRequired: data.isRequired !== undefined ? data.isRequired : true,
      order: this._questions.length + 1
    };
    this._questions.push(q);

    const container = document.getElementById('satQuestionsContainer');
    const card = document.createElement('div');
    card.className = 'sat-question-card animate-fade-in';
    card.id = id;

    card.innerHTML = `
      <div class="sat-question-header">
        <span class="question-number">ข้อที่ ${this._questions.length}</span>
        <span class="sat-type-badge ${type.toLowerCase()}">${type === 'RATING' ? '<i class="fa-solid fa-star"></i> ประเมินคะแนน' : '<i class="fa-solid fa-comment"></i> พิมพ์ข้อความ'}</span>
        <div style="margin-left:auto; display:flex; align-items:center; gap:var(--space-3);">
          <label class="form-check" style="margin:0;">
            <input type="checkbox" ${q.isRequired ? 'checked' : ''} class="sat-required">
            <span class="form-check-label" style="font-size:var(--text-xs);">บังคับตอบ</span>
          </label>
          <button class="btn btn-danger btn-sm btn-icon" onclick="SatisfactionPage._removeQuestion('${id}')" title="ลบ"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="question-card-body" style="padding:var(--space-5);">
        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label class="form-label">คำถาม</label>
          <input type="text" class="form-control sat-q-text" value="${q.questionText}" placeholder="พิมพ์คำถาม...">
        </div>
        <!-- Preview -->
        <div style="border-top:1px dashed var(--gray-200); padding-top:var(--space-4);">
          <div style="font-size:var(--text-xs); color:var(--gray-400); margin-bottom:var(--space-3);">ตัวอย่างการแสดงผล:</div>
          ${type === 'RATING' ? this._buildRatingPreview() : this._buildTextPreview()}
        </div>
      </div>
    `;

    container.appendChild(card);
    this._updateQuestionNumbers();
  },

  _buildRatingPreview() {
    const labels = ['น้อยที่สุด', 'น้อย', 'ปานกลาง', 'มาก', 'มากที่สุด'];
    return `
      <div class="rating-scale">
        ${[1,2,3,4,5].map(v => `
          <div class="rating-option">
            <div class="rating-circle">${v}</div>
            <div class="rating-desc">${labels[v-1]}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  _buildTextPreview() {
    return `<textarea class="form-control" rows="2" placeholder="ผู้ประเมินจะพิมพ์ข้อความที่นี่..." disabled style="opacity:0.5;"></textarea>`;
  },

  _removeQuestion(id) {
    const idx = this._questions.findIndex(q => q.id === id);
    if (idx !== -1) this._questions.splice(idx, 1);
    document.getElementById(id)?.remove();
    this._updateQuestionNumbers();
  },

  _updateQuestionNumbers() {
    document.querySelectorAll('.sat-question-card .question-number').forEach((el, i) => {
      el.textContent = `ข้อที่ ${i + 1}`;
    });
    const countEl = document.getElementById('satQuestionCount');
    if (countEl) countEl.textContent = `${this._questions.length} คำถาม`;
  },

  _collectQuestions() {
    return this._questions.map((q, i) => {
      const card = document.getElementById(q.id);
      if (!card) return null;
      return {
        ...q,
        order: i + 1,
        questionText: card.querySelector('.sat-q-text')?.value.trim() || q.questionText,
        isRequired: card.querySelector('.sat-required')?.checked ?? true
      };
    }).filter(Boolean);
  },

  async _saveForm() {
    if (!this._trainingId) { UI.error('กรุณาระบุรหัสการอบรมก่อน'); return; }

    const questions = this._collectQuestions();
    if (!questions.length) { UI.warning('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ'); return; }

    const invalid = questions.some(q => !q.questionText);
    if (invalid) { UI.error('กรุณากรอกคำถามให้ครบถ้วน'); return; }

    const btn = document.getElementById('saveSatBtn');
    UI.setButtonLoading(btn, true, 'กำลังบันทึก...');

    try {
      await API.saveSatisfactionForm(this._trainingId, questions);

      const rating = questions.filter(q => q.questionType === 'RATING').length;
      const text   = questions.filter(q => q.questionType === 'TEXT').length;
      document.getElementById('satSummary').textContent =
        `${questions.length} คำถาม (ประเมินคะแนน ${rating} ข้อ · พิมพ์ข้อความ ${text} ข้อ)`;

      const base = window.location.href.split('#')[0];
      const url  = `${base}#/satisfaction?id=${this._trainingId}&mode=take`;
      document.getElementById('satQrUrl').textContent = url;
      Utils.generateQR(document.getElementById('satQRCanvas'), url, 180);
      document.getElementById('satQrPanel').classList.remove('hidden');
      document.getElementById('satQrPanel').scrollIntoView({ behavior: 'smooth' });
      UI.success('บันทึกแบบประเมินสำเร็จ!');
    } catch (err) {
      UI.error('ไม่สามารถบันทึก: ' + err.message);
    } finally {
      UI.setButtonLoading(btn, false);
    }
  },

  async _loadExisting() {
    if (!this._trainingId) { UI.error('กรุณาระบุรหัสการอบรมก่อน'); return; }
    try {
      const existing = await API.getSatisfactionForm(this._trainingId);
      if (!existing?.length) { UI.info('ยังไม่มีแบบประเมินสำหรับการอบรมนี้'); return; }
      this._questions = [];
      document.getElementById('satQuestionsContainer').innerHTML = '';
      existing.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(q => this._addQuestion(q.questionType, q));
      UI.success(`โหลด ${existing.length} คำถามเรียบร้อย`);
    } catch (err) {
      UI.error('ไม่สามารถโหลด: ' + err.message);
    }
  },

  _downloadQR() {
    const canvas = document.getElementById('satQRCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR_Satisfaction_${this._trainingId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  // ─── Take Form Mode ──────────────────────────────────────────
  async _renderTakeForm(container) {
    if (!this._trainingId) { UI.showError(container, 'ไม่พบรหัสการอบรม'); return; }
    UI.showPageLoader(container);
    try {
      const [form, participants] = await Promise.all([
        API.getSatisfactionForm(this._trainingId),
        API.getParticipants()
      ]);

      if (!form?.length) {
        UI.showEmpty(container, { icon: '<i class="fa-solid fa-star"></i>', title: 'ยังไม่มีแบบประเมิน', desc: 'ผู้ดูแลยังไม่ได้สร้างแบบประเมินสำหรับการอบรมนี้' });
        return;
      }

      const ratingLabels = ['', 'น้อยที่สุด', 'น้อย', 'ปานกลาง', 'มาก', 'มากที่สุด'];
      container.innerHTML = `
        <div class="register-page-wrapper animate-fade-in">
          <div class="training-info-banner" style="background: linear-gradient(135deg, var(--teal-700), var(--teal-800));">
            <div class="training-info-title"><i class="fa-solid fa-star"></i> แบบประเมินความพึงพอใจ</div>
            <div class="training-info-meta">
              <div class="training-meta-item"><i class="fa-solid fa-clipboard-list"></i> ${form.length} คำถาม</div>
            </div>
          </div>
          <div class="register-card">
            <div class="form-group" style="margin-bottom:var(--space-6);">
              <label class="form-label">ชื่อ-นามสกุล <span class="required">*</span></label>
              <div class="autocomplete-wrapper">
                <input type="text" id="satNameSearch" class="form-control" placeholder="พิมพ์ชื่อเพื่อค้นหา..." autocomplete="off">
                <div id="satAutocomplete" class="autocomplete-dropdown"></div>
              </div>
              <input type="hidden" id="satParticipantId">
            </div>
            <form id="satResponseForm">
              ${form.map((q, i) => `
                <div style="margin-bottom:var(--space-6); padding-bottom:var(--space-5); border-bottom:1px solid var(--gray-100);">
                  <p style="font-size:var(--text-base); font-weight:var(--fw-medium); margin-bottom:var(--space-4);">
                    ${i+1}. ${q.questionText}
                    ${q.isRequired ? '<span class="required">*</span>' : ''}
                  </p>
                  ${q.questionType === 'RATING' ? `
                    <div class="rating-scale">
                      ${[1,2,3,4,5].map(v => `
                        <div class="rating-option">
                          <input type="radio" name="sat_${q.formQuestionId || i}" value="${v}" id="r_${i}_${v}" ${q.isRequired ? 'required' : ''}>
                          <label for="r_${i}_${v}" class="rating-circle">${v}</label>
                          <div class="rating-desc">${ratingLabels[v]}</div>
                        </div>
                      `).join('')}
                    </div>
                    <style>.rating-option input:checked + .rating-circle { background:var(--teal-500); border-color:var(--teal-500); color:white; }</style>
                  ` : `
                    <textarea class="form-control" name="sat_${q.formQuestionId || i}" rows="3"
                      placeholder="พิมพ์ความคิดเห็น..." ${q.isRequired ? 'required' : ''}></textarea>
                  `}
                </div>
              `).join('')}
              <button type="submit" class="btn btn-teal btn-lg btn-block" id="submitSatBtn">
                📤 ส่งแบบประเมิน
              </button>
            </form>
          </div>
        </div>
      `;

      // Rating circle click styling
      container.querySelectorAll('.rating-option label').forEach(label => {
        label.addEventListener('click', () => {
          const input = label.previousElementSibling;
          const group = label.closest('.rating-scale');
          group?.querySelectorAll('.rating-circle').forEach(c => {
            c.style.background = '';
            c.style.borderColor = '';
            c.style.color = '';
          });
          label.style.background = 'var(--teal-500)';
          label.style.borderColor = 'var(--teal-500)';
          label.style.color = 'white';
        });
      });

      // Autocomplete
      const dSearch = Utils.debounce((q) => {
        const res = (participants || []).filter(p => Utils.matchesSearch(p.fullName, q)).slice(0, 8);
        const dd = document.getElementById('satAutocomplete');
        dd.innerHTML = res.length
          ? res.map(p => `<div class="autocomplete-item" data-id="${p.participantId}">${p.fullName}</div>`).join('')
          : `<div class="autocomplete-no-results">ไม่พบ "${q}"</div>`;
        dd.classList.add('show');
        dd.querySelectorAll('.autocomplete-item').forEach(item => {
          item.addEventListener('mousedown', () => {
            document.getElementById('satNameSearch').value = item.textContent;
            document.getElementById('satParticipantId').value = item.getAttribute('data-id');
            dd.classList.remove('show');
          });
        });
      }, 300);
      document.getElementById('satNameSearch').addEventListener('input', e => {
        if (e.target.value.length >= 2) dSearch(e.target.value);
      });

      // Submit
      document.getElementById('satResponseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('satNameSearch').value.trim();
        const participantId = document.getElementById('satParticipantId').value;
        if (!fullName) { UI.error('กรุณาระบุชื่อ-นามสกุล'); return; }

        const responses = form.map((q, i) => {
          const name = `sat_${q.formQuestionId || i}`;
          if (q.questionType === 'RATING') {
            const sel = container.querySelector(`input[name="${name}"]:checked`);
            return { formQuestionId: q.formQuestionId, questionType: 'RATING', ratingValue: sel ? parseInt(sel.value) : 0 };
          } else {
            const ta = container.querySelector(`textarea[name="${name}"]`);
            return { formQuestionId: q.formQuestionId, questionType: 'TEXT', textValue: ta?.value.trim() || '' };
          }
        });

        const btn = document.getElementById('submitSatBtn');
        UI.setButtonLoading(btn, true, 'กำลังส่ง...');
        try {
          await API.submitSatisfaction({ trainingId: this._trainingId, participantId: participantId || 'MANUAL', fullName, responses });
          container.innerHTML = `
            <div class="register-page-wrapper">
              <div class="success-page animate-scale-in">
                <div class="success-icon"><i class="fa-solid fa-star"></i></div>
                <h2 class="success-title">ขอบคุณสำหรับการประเมิน!</h2>
                <p class="success-subtitle">${fullName} — ส่งแบบประเมินเรียบร้อยแล้ว</p>
                <a href="#/" class="btn btn-ghost"><i class="fa-solid fa-house"></i> กลับหน้าหลัก</a>
              </div>
            </div>
          `;
        } catch (err) {
          UI.error('ไม่สามารถส่งแบบประเมิน: ' + err.message);
          UI.setButtonLoading(btn, false);
        }
      });

    } catch (err) {
      UI.showError(container, err.message);
    }
  },

  cleanup() {
    this._questions = [];
    this._trainingId = null;
  }
};
