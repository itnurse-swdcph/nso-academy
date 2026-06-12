/**
 * posttest.js — Module 4.2: Post-test Builder
 * เลือกใช้ Pre-test เดิม หรือสร้างใหม่
 */

const PosttestPage = {
  _trainingId: null,
  _mode: 'build',
  _usePretest: null,

  render(container, params) {
    this._trainingId = params.id || '';
    this._mode = params.mode || 'build';

    if (this._mode === 'take') {
      // Reuse pretest render logic with type=POST
      PretestPage._trainingId = this._trainingId;
      PretestPage._renderTakeTest(container).then(() => {
        // Override type label
        container.querySelectorAll('.training-info-title').forEach(el => {
          if (el.textContent.includes('Pre-test')) el.textContent = el.textContent.replace('Pre-test','Post-test');
        });
      });
      return;
    }

    this._renderChoice(container);
  },

  _renderChoice(container) {
    container.innerHTML = `
      <div class="animate-fade-in">
        <div class="page-header">
          <h1 class="page-title"><i class="fa-solid fa-file-lines"></i> Post-test Builder</h1>
          <p class="page-subtitle">รหัสอบรม: ${this._trainingId || '(ยังไม่ได้เลือก)'}</p>
        </div>

        ${!this._trainingId ? `
          <div class="alert alert-warning" style="margin-bottom:var(--space-5);">
            <span class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
            <div class="alert-content"><div class="alert-title">ไม่ได้เลือกหัวข้ออบรม</div>
            กรุณาเข้าผ่านระบบบริหารจัดการ</div>
          </div>
        ` : ''}

        <div class="card" style="max-width:600px; margin: 0 auto;">
          <div class="card-header">
            <div class="card-title">เลือกรูปแบบ Post-test</div>
          </div>
          <div class="card-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="feature-card" id="choosePretestBtn" style="text-align:center; cursor:pointer;">
                <div style="font-size:2.5rem; margin-bottom:var(--space-3); color: var(--teal-600);"><i class="fa-solid fa-rotate-left"></i></div>
                <div style="font-weight:var(--fw-bold); color:var(--navy-800); margin-bottom:var(--space-2);">ใช้ Pre-test เดิม</div>
                <div style="font-size:var(--text-xs); color:var(--gray-500);">นำข้อสอบ Pre-test มาใช้เป็น Post-test เลย</div>
              </div>
              <div class="feature-card" id="chooseNewBtn" style="text-align:center; cursor:pointer;">
                <div style="font-size:2.5rem; margin-bottom:var(--space-3); color: var(--navy-600);"><i class="fa-solid fa-pencil"></i></div>
                <div style="font-weight:var(--fw-bold); color:var(--navy-800); margin-bottom:var(--space-2);">สร้าง Post-test ใหม่</div>
                <div style="font-size:var(--text-xs); color:var(--gray-500);">สร้างข้อสอบ Post-test แยกต่างหากจาก Pre-test</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview/Confirm panel -->
        <div id="postChoiceResult" style="margin-top:var(--space-6);"></div>
      </div>
    `;

    document.getElementById('choosePretestBtn').addEventListener('click', () => this._handleUsePretest(container));
    document.getElementById('chooseNewBtn').addEventListener('click', () => this._handleCreateNew(container));
  },

  async _handleUsePretest(container) {
    if (!this._trainingId) { UI.error('กรุณาระบุรหัสการอบรมก่อน'); return; }

    const resultEl = document.getElementById('postChoiceResult');
    UI.showPageLoader(resultEl);

    try {
      const questions = await API.getQuestions(this._trainingId, 'PRE');
      if (!questions?.length) {
        UI.showEmpty(resultEl, {
          icon: '<i class="fa-solid fa-clipboard-list"></i>',
          title: 'ยังไม่มี Pre-test',
          desc: 'กรุณาสร้าง Pre-test ก่อน',
          action: `<a href="#/pretest?id=${this._trainingId}" class="btn btn-teal">สร้าง Pre-test</a>`
        });
        return;
      }

      const totalScore = questions.reduce((s, q) => s + (q.score || 1), 0);
      resultEl.innerHTML = `
        <div class="card animate-fade-in">
          <div class="card-header">
            <div class="card-title"><i class="fa-solid fa-rotate-left"></i> ตัวอย่างข้อสอบ Pre-test (${questions.length} ข้อ · ${totalScore} คะแนน)</div>
          </div>
          <div class="card-body">
            <div style="max-height:300px; overflow-y:auto;">
              ${questions.slice(0, 5).map((q, i) => `
                <div style="padding:var(--space-3) 0; border-bottom:1px solid var(--gray-100);">
                  <span class="question-number" style="margin-right:var(--space-2);">ข้อ ${i+1}</span>
                  ${q.questionText}
                </div>
              `).join('')}
              ${questions.length > 5 ? `<div style="text-align:center; padding:var(--space-3); color:var(--gray-400);">... และอีก ${questions.length-5} ข้อ</div>` : ''}
            </div>
            <div class="alert alert-info" style="margin-top:var(--space-4);">
              <span class="alert-icon"><i class="fa-solid fa-circle-info"></i></span>
              <div class="alert-content">การกดยืนยันจะบันทึก Post-test โดยใช้ข้อสอบ Pre-test ทั้งหมด ${questions.length} ข้อ</div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-ghost" onclick="PosttestPage._renderChoice(document.getElementById('app'))">← กลับ</button>
            <button class="btn btn-primary" id="confirmUsePretest"><i class="fa-solid fa-circle-check"></i> ยืนยันใช้ Pre-test เดิม</button>
          </div>
        </div>
      `;

      document.getElementById('confirmUsePretest').addEventListener('click', async () => {
        const btn = document.getElementById('confirmUsePretest');
        UI.setButtonLoading(btn, true, 'กำลังบันทึก...');
        try {
          // Save the pretest questions as posttest
          await API.saveQuestions(this._trainingId, 'POST', questions.map(q => ({...q, testType: 'POST'})));
          this._showPostQR(resultEl, questions.length, totalScore);
          UI.success('บันทึก Post-test สำเร็จ!');
        } catch(err) {
          UI.error('ไม่สามารถบันทึก: ' + err.message);
        } finally {
          UI.setButtonLoading(btn, false);
        }
      });

    } catch (err) {
      UI.showError(resultEl, err.message);
    }
  },

  _handleCreateNew(container) {
    // Reuse PretestPage builder but with type = POST
    const appContainer = document.getElementById('app');
    PretestPage._trainingId = this._trainingId;
    PretestPage._questions = [];
    PretestPage._mode = 'build';

    // Override saveQuestions to use POST type
    const origSave = PretestPage._saveQuestions.bind(PretestPage);
    PretestPage._saveQuestions = async function() {
      const questions = PretestPage._collectQuestions();
      if (!questions.length) { UI.warning('กรุณาเพิ่มข้อสอบ'); return; }
      const btn = document.getElementById('saveQuestionsBtn');
      UI.setButtonLoading(btn, true, 'กำลังบันทึก...');
      try {
        await API.saveQuestions(PretestPage._trainingId, 'POST', questions);
        const totalScore = questions.reduce((s, q) => s + (q.score || 0), 0);
        document.getElementById('qrQuestionCount').textContent = questions.length;
        document.getElementById('qrTotalScore').textContent = totalScore;
        const url = Utils.buildPosttestUrl(PretestPage._trainingId);
        document.getElementById('pretestQrUrl').textContent = url;
        Utils.generateQR(document.getElementById('pretestQRCanvas'), url, 180);
        document.getElementById('pretestQrPanel').classList.remove('hidden');
        document.getElementById('pretestQrPanel').scrollIntoView({ behavior: 'smooth' });
        UI.success(`บันทึก ${questions.length} ข้อสอบ Post-test สำเร็จ!`);
        PretestPage._saveQuestions = origSave; // restore
      } catch(err) {
        UI.error('ไม่สามารถบันทึก: ' + err.message);
      } finally {
        UI.setButtonLoading(btn, false);
      }
    };

    PretestPage._renderBuilder(appContainer);

    // Update title
    appContainer.querySelector('.page-title').innerHTML = '<i class="fa-solid fa-file-lines"></i> Post-test Builder';
  },

  _showPostQR(el, count, totalScore) {
    const url = Utils.buildPosttestUrl(this._trainingId);
    el.innerHTML = `
      <div class="result-panel animate-fade-in">
        <div class="result-panel-title"><i class="fa-solid fa-circle-check text-success"></i> Post-test พร้อมใช้งาน!</div>
        <div style="display:flex; gap:var(--space-6); flex-wrap:wrap; align-items:flex-start;">
          <div style="flex:1;">
            <div class="info-box">
              <div style="font-size:var(--text-sm); color:var(--gray-600);">
                ${count} ข้อ · รวม ${totalScore} คะแนน
              </div>
            </div>
          </div>
          <div class="qr-panel has-qr" style="width:260px;">
            <div class="qr-label"><i class="fa-solid fa-qrcode"></i> QR Code Post-test</div>
            <div class="qr-canvas-wrapper"><canvas id="posttestQRCanvas"></canvas></div>
            <div class="qr-url">${url}</div>
          </div>
        </div>
      </div>
    `;
    Utils.generateQR(document.getElementById('posttestQRCanvas'), url, 180);
  },

  cleanup() {
    this._trainingId = null;
    this._usePretest = null;
  }
};
