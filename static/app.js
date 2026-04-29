/**
 * Code Healer — Frontend Logic
 * Handles editor, file upload, drag-drop, API calls, and result rendering
 */

// ─── DOM References ─────────────────────────────────────────────────
const codeEl = document.getElementById('code');
const reviewBtn = document.getElementById('reviewBtn');
const btnIcon = document.getElementById('btnIcon');
const btnText = document.getElementById('btnText');
const clearBtn = document.getElementById('clearBtn');
const langSelect = document.getElementById('languageSelect');
const charCount = document.getElementById('charCount');
const resultsSection = document.getElementById('resultsSection');
const dropZone = document.getElementById('dropZone');
const dropOverlay = document.getElementById('dropOverlay');
const fileInput = document.getElementById('fileInput');

// ─── Character Counter ──────────────────────────────────────────────
codeEl.addEventListener('input', () => {
  const n = codeEl.value.length;
  charCount.textContent = `${n.toLocaleString()} / 10,000`;
  charCount.className = 'char-counter' + (n > 9000 ? ' warn' : '') + (n > 10000 ? ' over' : '');
});

// Tab key support
codeEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = codeEl.selectionStart, end = codeEl.selectionEnd;
    codeEl.value = codeEl.value.substring(0, s) + '    ' + codeEl.value.substring(end);
    codeEl.selectionStart = codeEl.selectionEnd = s + 4;
  }
});

// ─── File Upload ────────────────────────────────────────────────────
const EXT_MAP = {
  py:'python', js:'javascript', ts:'typescript', java:'java', cpp:'cpp', c:'c',
  go:'go', rs:'rust', php:'php', sql:'sql', rb:'ruby', swift:'swift',
  kt:'kotlin', scala:'scala', r:'r', dart:'dart', lua:'lua', pl:'perl',
  hs:'haskell', ex:'elixir', sh:'bash', ps1:'powershell', yml:'yaml',
  yaml:'yaml', json:'json', html:'html', css:'css'
};

function handleFile(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (EXT_MAP[ext]) langSelect.value = EXT_MAP[ext];
  const reader = new FileReader();
  reader.onload = (ev) => {
    codeEl.value = ev.target.result;
    codeEl.dispatchEvent(new Event('input'));
  };
  reader.readAsText(file);
}

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
  e.target.value = '';
});

// ─── Drag & Drop ────────────────────────────────────────────────────
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropOverlay.classList.add('active'); });
dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget)) dropOverlay.classList.remove('active');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropOverlay.classList.remove('active');
  handleFile(e.dataTransfer.files[0]);
});

// ─── Clear ──────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  codeEl.value = '';
  charCount.textContent = '0 / 10,000';
  charCount.className = 'char-counter';
  resultsSection.innerHTML = '';
  resultsSection.classList.remove('visible');
});

// ─── Review ─────────────────────────────────────────────────────────
reviewBtn.addEventListener('click', runReview);

// Ctrl+Enter shortcut
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runReview(); }
});

async function runReview() {
  const code = codeEl.value.trim();
  if (!code) { codeEl.focus(); return; }

  reviewBtn.disabled = true;
  btnIcon.textContent = '⟳';
  btnText.textContent = 'Reviewing...';

  resultsSection.classList.add('visible');
  resultsSection.innerHTML = `
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <div class="loading-text">Analyzing with AI</div>
      <div class="loading-sub">Checking for bugs, security issues, and improvements...</div>
    </div>`;

  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: langSelect.value }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Server error' }));
      throw new Error(err.detail || `Error ${res.status}`);
    }

    const data = await res.json();
    renderResults(data.review);
  } catch (err) {
    resultsSection.innerHTML = `
      <div class="error-card">
        <span style="font-size:20px">⚠</span>
        <span>${esc(err.message)}</span>
      </div>`;
  } finally {
    reviewBtn.disabled = false;
    btnIcon.textContent = '▶';
    btnText.textContent = 'Run Review';
  }
}

// ─── Render Results ─────────────────────────────────────────────────
function renderResults(review) {
  resultsSection.innerHTML = '';
  resultsSection.classList.add('visible');

  const score = Math.max(1, Math.min(10, review.score || 5));
  const cls = score >= 7 ? 'high' : score >= 4 ? 'mid' : 'low';
  const label = score >= 7 ? 'Great code quality' : score >= 4 ? 'Needs improvement' : 'Significant issues found';
  const pct = score * 10;

  // Score Card
  const scoreCard = document.createElement('div');
  scoreCard.className = 'score-card';
  scoreCard.innerHTML = `
    <div class="score-visual ${cls}">
      <span class="score-num ${cls}">${score}<span class="unit">/10</span></span>
    </div>
    <div class="score-info">
      <div class="score-label">${label}</div>
      <div class="score-summary">${esc(review.summary || '')}</div>
      <div class="score-bar-bg"><div class="score-bar" id="scoreBar"></div></div>
    </div>`;
  resultsSection.appendChild(scoreCard);
  setTimeout(() => { const bar = document.getElementById('scoreBar'); if (bar) bar.style.width = pct + '%'; }, 100);

  // Categorize issues by severity
  const issues = review.issues || [];
  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');
  const suggestions = review.suggestions || [];

  // Results Grid
  const grid = document.createElement('div');
  grid.className = 'results-grid';

  const sections = [
    { items: critical, emoji: '🔴', label: 'Critical Issues', cls: 'c-critical', delay: 0 },
    { items: warnings, emoji: '🟡', label: 'Warnings', cls: 'c-warning', delay: 0.06 },
    { items: infos, emoji: '🔵', label: 'Info', cls: 'c-info', delay: 0.12 },
    { items: suggestions.map(s => ({ title: s.title, description: s.description, priority: s.priority })),
      emoji: '💡', label: 'Suggestions', cls: 'c-suggestions', delay: 0.18 },
  ];

  sections.forEach((sec) => {
    if (!sec.items.length) return;

    const card = document.createElement('div');
    card.className = `result-card ${sec.cls}`;
    card.style.animationDelay = `${sec.delay}s`;

    const itemsHtml = sec.items.map(item => {
      const line = item.line ? ` <span style="opacity:0.5;font-size:12px">(line ${item.line})</span>` : '';
      const fix = item.fix ? `<div style="margin-top:4px;font-size:12px;color:var(--mint)">💚 ${esc(item.fix)}</div>` : '';
      return `
        <div class="result-item">
          <span class="result-bullet">▸</span>
          <div>
            <strong>${esc(item.title)}</strong>${line}<br/>
            <span>${esc(item.description)}</span>
            ${fix}
          </div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="result-header">
        <span class="result-title">${sec.emoji} ${sec.label}</span>
        <span class="result-count">${sec.items.length}</span>
      </div>
      <div class="result-body">${itemsHtml}</div>`;
    grid.appendChild(card);
  });

  if (grid.children.length > 0) {
    resultsSection.appendChild(grid);
  } else {
    const empty = document.createElement('div');
    empty.className = 'score-card';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px';
    empty.innerHTML = `<div style="font-size:48px;margin-bottom:12px">🎉</div>
      <div style="font-size:16px;font-weight:600;color:var(--mint)">No issues found!</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-top:4px">Your code looks clean and well-written.</div>`;
    resultsSection.appendChild(empty);
  }

  // Fixed Code
  if (review.fixed_code && review.fixed_code.trim() !== codeEl.value.trim()) {
    const fixCard = document.createElement('div');
    fixCard.className = 'fixed-card';
    fixCard.innerHTML = `
      <div class="fixed-header">
        <span class="fixed-label">✦ Fixed Code</span>
        <button class="btn btn-secondary" style="padding:6px 14px;font-size:13px;" id="copyFixedBtn">📋 Copy</button>
      </div>
      <pre class="fixed-output" id="fixedOutput">${esc(review.fixed_code)}</pre>`;
    resultsSection.appendChild(fixCard);

    document.getElementById('copyFixedBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(review.fixed_code).then(() => {
        const btn = document.getElementById('copyFixedBtn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
      });
    });
  }

  // Scroll to results
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

// ─── Helpers ────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
