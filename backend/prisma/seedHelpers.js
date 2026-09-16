/**
 * Pure helpers used by seed.js to generate a realistic-looking history of
 * demo sales. Kept dependency-free and separate from the actual Prisma
 * calls so they can be unit tested on their own (see tests/seedHelpers.test.js).
 */

/** Deterministic PRNG (mulberry32) — same seed always produces the same demo data. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max], inclusive. */
function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Weighted random pick from [{ value, weight }, ...]. */
function pickWeighted(rand, items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Picks `count` distinct items from `pool` without replacement (pool must have >= count items). */
function pickDistinct(rand, pool, count) {
  const copy = [...pool];
  const result = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = randInt(rand, 0, copy.length - 1);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

const HOUR_WEIGHTS = [
  ...[7, 8, 9, 10].map((h) => ({ value: h, weight: 2 })),
  ...[11, 12, 13].map((h) => ({ value: h, weight: 5 })),
  ...[14, 15, 16].map((h) => ({ value: h, weight: 3 })),
  ...[17, 18, 19].map((h) => ({ value: h, weight: 5 })),
  ...[20, 21].map((h) => ({ value: h, weight: 2 })),
];

/** A plausible {hour, minute, second} for a sale, busier at lunch and early evening, store open 7am-10pm. */
function randomSaleTimeOfDay(rand) {
  return {
    hour: pickWeighted(rand, HOUR_WEIGHTS),
    minute: randInt(rand, 0, 59),
    second: randInt(rand, 0, 59),
  };
}

/** How many sales happened on a given day — a bit busier on weekends. */
function salesCountForDay(rand, isWeekend) {
  return isWeekend ? randInt(rand, 18, 32) : randInt(rand, 10, 22);
}

/** How many distinct product lines are in one basket — most trips are small. */
function basketLineCount(rand) {
  return pickWeighted(rand, [
    { value: 1, weight: 15 },
    { value: 2, weight: 20 },
    { value: 3, weight: 20 },
    { value: 4, weight: 15 },
    { value: 5, weight: 10 },
    { value: 8, weight: 8 },
    { value: 12, weight: 4 },
  ]);
}

/** Quantity for one basket line: mostly 1, occasionally a few, rarely a bulk buy — capped by what's in stock. */
function lineQuantity(rand, unit, available) {
  const wantsFraction = unit === 'kg' || unit === 'lb';
  const raw = pickWeighted(rand, [
    { value: 1, weight: 50 },
    { value: 2, weight: 25 },
    { value: 3, weight: 12 },
    { value: 4, weight: 7 },
    { value: 6, weight: 4 },
  ]);
  const qty = wantsFraction ? Math.round((raw * (0.6 + rand() * 0.8)) * 10) / 10 : raw;
  return Math.max(wantsFraction ? 0.1 : 1, Math.min(qty, available));
}

module.exports = {
  mulberry32,
  randInt,
  pickWeighted,
  pickDistinct,
  randomSaleTimeOfDay,
  salesCountForDay,
  basketLineCount,
  lineQuantity,
};
