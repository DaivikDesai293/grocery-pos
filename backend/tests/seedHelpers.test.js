const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mulberry32,
  randInt,
  pickWeighted,
  pickDistinct,
  salesCountForDay,
  basketLineCount,
  lineQuantity,
} = require('../prisma/seedHelpers');

test('mulberry32 is deterministic: same seed -> same sequence', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('mulberry32 produces values in [0, 1)', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = rand();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test('randInt respects inclusive bounds over many draws', () => {
  const rand = mulberry32(1);
  let sawMin = false;
  let sawMax = false;
  for (let i = 0; i < 2000; i++) {
    const v = randInt(rand, 1, 3);
    assert.ok(v >= 1 && v <= 3);
    if (v === 1) sawMin = true;
    if (v === 3) sawMax = true;
  }
  assert.ok(sawMin && sawMax, 'expected to see both boundary values over 2000 draws');
});

test('pickWeighted never returns an item with zero total probability of appearing', () => {
  const rand = mulberry32(3);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 1000; i++) {
    const v = pickWeighted(rand, [
      { value: 'a', weight: 9 },
      { value: 'b', weight: 1 },
    ]);
    counts[v]++;
  }
  // Roughly 90/10 — allow a generous margin since this is a statistical check, not exact.
  assert.ok(counts.a > counts.b, `expected 'a' to dominate, got ${JSON.stringify(counts)}`);
  assert.ok(counts.b > 0, "expected the low-weight option to appear at least once in 1000 draws");
});

test('pickDistinct never repeats an element and respects pool size', () => {
  const rand = mulberry32(9);
  const pool = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const picked = pickDistinct(rand, pool, 3);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  for (const p of picked) assert.ok(pool.includes(p));
});

test('pickDistinct caps at pool length when count exceeds it', () => {
  const rand = mulberry32(9);
  const picked = pickDistinct(rand, ['only-one'], 5);
  assert.deepEqual(picked, ['only-one']);
});

test('salesCountForDay: weekends are busier than weekdays on average', () => {
  const rand = mulberry32(11);
  let weekdayTotal = 0;
  let weekendTotal = 0;
  const n = 500;
  for (let i = 0; i < n; i++) weekdayTotal += salesCountForDay(rand, false);
  for (let i = 0; i < n; i++) weekendTotal += salesCountForDay(rand, true);
  assert.ok(weekendTotal / n > weekdayTotal / n, 'expected weekend average > weekday average');
});

test('basketLineCount always returns a positive integer', () => {
  const rand = mulberry32(5);
  for (let i = 0; i < 500; i++) {
    const n = basketLineCount(rand);
    assert.ok(Number.isInteger(n) && n > 0);
  }
});

test('lineQuantity never exceeds what is available in stock', () => {
  const rand = mulberry32(2);
  for (let i = 0; i < 500; i++) {
    const q = lineQuantity(rand, 'each', 2);
    assert.ok(q <= 2, `quantity ${q} exceeded available stock of 2`);
    assert.ok(q >= 1);
  }
});

test('lineQuantity for weighed goods (kg) can be fractional', () => {
  const rand = mulberry32(2);
  let sawFraction = false;
  for (let i = 0; i < 200; i++) {
    const q = lineQuantity(rand, 'kg', 50);
    if (!Number.isInteger(q)) sawFraction = true;
  }
  assert.ok(sawFraction, 'expected at least one fractional kg quantity over 200 draws');
});
