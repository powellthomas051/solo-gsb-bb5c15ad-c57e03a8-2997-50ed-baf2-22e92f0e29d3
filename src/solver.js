'use strict';

/**
 * 一维下料精确求解（分支限界）。
 *
 * 规则：
 *  - 目标：使用原料根数最少；
 *  - 锯缝只发生在同一根原料上相邻两片之间，
 *    即一根原料裁 k 片，消耗 = 片长之和 + (k - 1) * 锯缝宽度；
 *  - 根数相同时，优先让余料集中（各根余长按从大到小字典序最大），
 *    便于余料再次利用。
 *
 * 输入片数 <= 12，精确搜索代价很低。
 */

const EPS = 1e-9;

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function round4(v) {
  return Math.round((v + Number.EPSILON) * 10000) / 10000;
}

/** 各根余长（降序），用于同根数下的方案比较 */
function remainderProfile(binsPieces, stockLength, kerf) {
  return binsPieces
    .map((ps) => stockLength - (sum(ps) + kerf * (ps.length - 1)))
    .sort((a, b) => b - a);
}

/** a 是否字典序大于 b（均已降序排列） */
function lexGreater(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i] + EPS) return true;
    if (a[i] < b[i] - EPS) return false;
  }
  return false;
}

/** 首次适应递减，给出一个初始上界解 */
function firstFitDecreasing(sortedPieces, stockLength, kerf) {
  const bins = [];
  for (const p of sortedPieces) {
    let placed = false;
    for (const b of bins) {
      const need = p + (b.pieces.length > 0 ? kerf : 0);
      if (need <= b.remaining + EPS) {
        b.pieces.push(p);
        b.remaining -= need;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push({ pieces: [p], remaining: stockLength - p });
    }
  }
  return bins;
}

/**
 * @param {number} stockLength 原料长度
 * @param {number} kerf 锯缝宽度
 * @param {number[]} lengths 展开后的全部裁片长度
 * @returns {{stockCount:number,totalPieces:number,totalWaste:number,stocks:Array}}
 */
function solve(stockLength, kerf, lengths) {
  const pieces = [...lengths].sort((a, b) => b - a);
  const n = pieces.length;

  // 初始上界
  let bestBins = firstFitDecreasing(pieces, stockLength, kerf).map((b) => [...b.pieces]);
  let bestProfile = remainderProfile(bestBins, stockLength, kerf);

  const bins = []; // { pieces: number[], remaining: number }

  function dfs(i) {
    if (i === n) {
      const current = bins.map((b) => b.pieces);
      if (current.length < bestBins.length) {
        bestBins = current.map((ps) => [...ps]);
        bestProfile = remainderProfile(bestBins, stockLength, kerf);
      } else if (current.length === bestBins.length) {
        const profile = remainderProfile(current, stockLength, kerf);
        if (lexGreater(profile, bestProfile)) {
          bestBins = current.map((ps) => [...ps]);
          bestProfile = profile;
        }
      }
      return;
    }
    if (bins.length > bestBins.length) return;

    const p = pieces[i];

    // 先试已有原料（剩余空间小者优先 = best-fit），相同余量只试一次
    const triedRemaining = new Set();
    const candidates = bins
      .filter((b) => p + (b.pieces.length > 0 ? kerf : 0) <= b.remaining + EPS)
      .sort((a, b) => a.remaining - b.remaining);
    for (const b of candidates) {
      const key = b.remaining.toFixed(9);
      if (triedRemaining.has(key)) continue;
      triedRemaining.add(key);
      const need = p + (b.pieces.length > 0 ? kerf : 0);
      b.pieces.push(p);
      b.remaining -= need;
      dfs(i + 1);
      b.remaining += need;
      b.pieces.pop();
    }

    // 再开一根新原料（前提是根数仍可能不超过当前最优）
    if (bins.length + 1 <= bestBins.length) {
      bins.push({ pieces: [p], remaining: stockLength - p });
      dfs(i + 1);
      bins.pop();
    }
  }

  dfs(0);

  const stocks = bestBins.map((ps, idx) => {
    const cuts = ps.length - 1;
    const used = sum(ps) + kerf * cuts;
    return {
      index: idx + 1,
      pieces: ps.map(round4),
      cuts,
      used: round4(used),
      remainder: round4(stockLength - used),
    };
  });

  return {
    stockCount: stocks.length,
    totalPieces: n,
    totalWaste: round4(sum(stocks.map((s) => s.remainder))),
    stocks,
  };
}

module.exports = { solve };
