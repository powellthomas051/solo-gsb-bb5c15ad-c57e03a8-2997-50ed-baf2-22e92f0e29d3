'use strict';

const MAX_PIECES = 12;
const PIECE_COLORS = ['#c98a4b', '#7ba05b', '#5b8dc9', '#b06ab3', '#c95b5b', '#4ba8a0'];

const specRowsEl = document.getElementById('specRows');
const errorEl = document.getElementById('error');
const resultPanel = document.getElementById('resultPanel');
const summaryEl = document.getElementById('summary');
const stocksEl = document.getElementById('stocks');

/* ---------- 规格行管理 ---------- */

function addSpecRow(length = '', quantity = '') {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="spec-index"></td>
    <td><input type="number" class="spec-length" min="0" step="any" placeholder="如 800" value="${length}"></td>
    <td><input type="number" class="spec-qty" min="1" max="${MAX_PIECES}" step="1" placeholder="如 2" value="${quantity}"></td>
    <td><button type="button" class="btn danger small" title="删除该行">✕</button></td>
  `;
  tr.querySelector('.danger').addEventListener('click', () => {
    if (specRowsEl.children.length > 1) {
      tr.remove();
      renumber();
    }
  });
  specRowsEl.appendChild(tr);
  renumber();
}

function renumber() {
  [...specRowsEl.children].forEach((tr, i) => {
    tr.querySelector('.spec-index').textContent = `规格 ${i + 1}`;
  });
}

/* ---------- 输入收集与校验（前端预检，后端为最终裁决） ---------- */

function collectInput() {
  const stockLength = parseFloat(document.getElementById('stockLength').value);
  const kerf = parseFloat(document.getElementById('kerf').value);

  if (!Number.isFinite(stockLength) || stockLength <= 0) {
    throw new Error('原料长度必须是大于 0 的数字。');
  }
  if (!Number.isFinite(kerf) || kerf < 0) {
    throw new Error('锯缝宽度必须是不小于 0 的数字。');
  }

  const specs = [];
  let total = 0;
  [...specRowsEl.children].forEach((tr, i) => {
    const length = parseFloat(tr.querySelector('.spec-length').value);
    const quantity = parseInt(tr.querySelector('.spec-qty').value, 10);
    const label = `第 ${i + 1} 个规格`;
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error(`${label}的长度必须是大于 0 的数字。`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`${label}的数量必须是正整数。`);
    }
    if (length > stockLength) {
      throw new Error(`${label}（长度 ${length}）超过原料长度 ${stockLength}，单根原料无法裁出该规格。`);
    }
    specs.push({ length, quantity });
    total += quantity;
  });

  if (specs.length === 0) throw new Error('请至少添加一个裁片规格。');
  if (total > MAX_PIECES) {
    throw new Error(`展开后总裁片数为 ${total} 片，超过上限 ${MAX_PIECES} 片，请减少各规格数量。`);
  }
  return { stockLength, kerf, specs };
}

/* ---------- 结果渲染 ---------- */

function fmt(v) {
  return Number.isInteger(v) ? String(v) : String(v);
}

function render(data) {
  const { stockLength, kerf, stockCount, totalPieces, totalWaste, stocks } = data;
  const usedSum = stocks.reduce((a, s) => a + s.used, 0);
  const utilization = ((usedSum / (stockCount * stockLength)) * 100).toFixed(1);

  summaryEl.innerHTML = `
    <div class="stat"><span class="num">${stockCount}</span><span>原料根数</span></div>
    <div class="stat"><span class="num">${totalPieces}</span><span>裁片总数</span></div>
    <div class="stat"><span class="num">${fmt(totalWaste)}</span><span>总余料（mm）</span></div>
    <div class="stat"><span class="num">${utilization}%</span><span>原料利用率</span></div>
  `;

  stocksEl.innerHTML = '';
  stocks.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'stock-card';

    // 比例示意条：裁片按长度占比，锯缝按宽度占比，余料灰色
    const bar = document.createElement('div');
    bar.className = 'stock-bar';
    s.pieces.forEach((p, i) => {
      const seg = document.createElement('div');
      seg.className = 'seg piece';
      seg.style.width = `${(p / stockLength) * 100}%`;
      seg.style.background = PIECE_COLORS[idx % PIECE_COLORS.length];
      seg.textContent = fmt(p);
      seg.title = `裁片 ${fmt(p)} mm`;
      bar.appendChild(seg);
      if (i < s.pieces.length - 1 && kerf > 0) {
        const k = document.createElement('div');
        k.className = 'seg kerf';
        k.style.width = `${(kerf / stockLength) * 100}%`;
        k.title = `锯缝 ${fmt(kerf)} mm`;
        bar.appendChild(k);
      }
    });
    if (s.remainder > 0) {
      const rem = document.createElement('div');
      rem.className = 'seg remainder';
      rem.style.width = `${(s.remainder / stockLength) * 100}%`;
      rem.textContent = s.remainder >= stockLength * 0.06 ? `余 ${fmt(s.remainder)}` : '';
      rem.title = `余料 ${fmt(s.remainder)} mm`;
      bar.appendChild(rem);
    }

    const seq = s.pieces.map(fmt).join(' → ');
    card.innerHTML = `
      <h3>第 ${s.index} 根原料 <span class="tag">${s.pieces.length} 片</span></h3>
      <p class="detail">裁片顺序：${seq}（mm）　锯缝：${s.cuts} 道　余长：<strong>${fmt(s.remainder)} mm</strong></p>
    `;
    card.appendChild(bar);
    stocksEl.appendChild(card);
  });

  resultPanel.classList.remove('hidden');
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 事件 ---------- */

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

document.getElementById('addSpec').addEventListener('click', () => addSpecRow());

document.getElementById('calc').addEventListener('click', async () => {
  errorEl.classList.add('hidden');
  let payload;
  try {
    payload = collectInput();
  } catch (e) {
    showError(e.message);
    return;
  }
  try {
    const res = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      showError(json.error || '计算失败，请检查输入。');
      return;
    }
    render(json.data);
  } catch (e) {
    showError('无法连接服务器，请稍后重试。');
  }
});

document.getElementById('printBtn').addEventListener('click', () => window.print());

/* ---------- 初始示例 ---------- */
addSpecRow(800, 2);
addSpecRow(600, 3);
addSpecRow(400, 2);
