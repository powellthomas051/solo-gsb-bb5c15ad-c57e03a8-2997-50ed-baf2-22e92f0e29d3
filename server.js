'use strict';

const path = require('path');
const express = require('express');
const { solve } = require('./src/solver');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_PIECES = 12; // 总裁片数上限

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

app.post('/api/optimize', (req, res) => {
  const body = req.body || {};
  const { stockLength, kerf, specs } = body;

  if (!isFiniteNumber(stockLength) || stockLength <= 0) {
    return badRequest(res, '原料长度必须是大于 0 的数字。');
  }
  if (!isFiniteNumber(kerf) || kerf < 0) {
    return badRequest(res, '锯缝宽度必须是不小于 0 的数字。');
  }
  if (!Array.isArray(specs) || specs.length === 0) {
    return badRequest(res, '请至少添加一个裁片规格。');
  }

  // 展开同规格裁片
  const pieces = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i] || {};
    const label = `第 ${i + 1} 个规格`;
    if (!isFiniteNumber(s.length) || s.length <= 0) {
      return badRequest(res, `${label}的长度必须是大于 0 的数字。`);
    }
    if (!Number.isInteger(s.quantity) || s.quantity < 1) {
      return badRequest(res, `${label}的数量必须是正整数。`);
    }
    if (s.length > stockLength) {
      return badRequest(
        res,
        `${label}（长度 ${s.length}）超过原料长度 ${stockLength}，单根原料无法裁出该规格，请修改长度。`
      );
    }
    for (let k = 0; k < s.quantity; k++) pieces.push(s.length);
  }

  if (pieces.length > MAX_PIECES) {
    return badRequest(
      res,
      `展开后总裁片数为 ${pieces.length} 片，超过上限 ${MAX_PIECES} 片，请减少各规格数量。`
    );
  }

  const result = solve(stockLength, kerf, pieces);
  res.json({ ok: true, data: { stockLength, kerf, ...result } });
});

app.listen(PORT, () => {
  console.log(`下料优化服务已启动：http://localhost:${PORT}`);
});
