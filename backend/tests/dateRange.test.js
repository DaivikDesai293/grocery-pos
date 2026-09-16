const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveRangePreset,
  resolveCustomRange,
  dailyBucketLabels,
  ymdToLabel,
} = require('../src/utils/dateRange');

const TZ = 'America/New_York';
// Tue Sep 15 2026, 09:00 EDT (13:00 UTC) — a fixed "now" so tests are deterministic.
const NOW = new Date('2026-09-15T13:00:00Z');

test('today: local midnight to local midnight, 24 hours, in UTC terms', () => {
  const { from, to } = resolveRangePreset('today', TZ, NOW);
  assert.equal(from.toISOString(), '2026-09-15T04:00:00.000Z'); // midnight EDT = 04:00 UTC
  assert.equal(to.toISOString(), '2026-09-16T04:00:00.000Z');
});

test('yesterday is the single day immediately before today, not "24 hours ago"', () => {
  const today = resolveRangePreset('today', TZ, NOW);
  const yesterday = resolveRangePreset('yesterday', TZ, NOW);
  assert.equal(yesterday.to.getTime(), today.from.getTime()); // ranges are contiguous
});

test('this_week starts Monday and runs through the end of today', () => {
  // 2026-09-15 is a Tuesday, so Monday is 2026-09-14.
  const { from, to } = resolveRangePreset('this_week', TZ, NOW);
  assert.equal(from.toISOString(), '2026-09-14T04:00:00.000Z');
  assert.equal(to.toISOString(), '2026-09-16T04:00:00.000Z');
});

test('last_week is the full Mon-Sun week before this_week, with no gap or overlap', () => {
  const thisWeek = resolveRangePreset('this_week', TZ, NOW);
  const lastWeek = resolveRangePreset('last_week', TZ, NOW);
  assert.equal(lastWeek.to.getTime(), thisWeek.from.getTime());
  const spanDays = (lastWeek.to.getTime() - lastWeek.from.getTime()) / 86_400_000;
  assert.equal(spanDays, 7);
});

test('this_month starts on the 1st', () => {
  const { from } = resolveRangePreset('this_month', TZ, NOW);
  assert.equal(from.toISOString(), '2026-09-01T04:00:00.000Z');
});

test('DST fall-back day (Nov 1 2026) is correctly 25 hours long', () => {
  const dayAfter = new Date('2026-11-02T12:00:00Z');
  const { from, to } = resolveRangePreset('yesterday', TZ, dayAfter);
  assert.equal((to - from) / 3_600_000, 25);
});

test('DST spring-forward day (Mar 8 2026) is correctly 23 hours long', () => {
  const dayAfter = new Date('2026-03-09T12:00:00Z');
  const { from, to } = resolveRangePreset('yesterday', TZ, dayAfter);
  assert.equal((to - from) / 3_600_000, 23);
});

test('resolveCustomRange is inclusive of both endpoint dates', () => {
  const { from, to } = resolveCustomRange('2026-09-01', '2026-09-03', TZ);
  const labels = dailyBucketLabels(from, to, TZ).map(ymdToLabel);
  assert.deepEqual(labels, ['2026-09-01', '2026-09-02', '2026-09-03']);
});

test('an unknown preset throws rather than silently returning a wrong range', () => {
  assert.throws(() => resolveRangePreset('next_century', TZ, NOW));
});
