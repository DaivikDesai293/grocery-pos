/**
 * Timezone-aware date-range helpers for reports, built only on `Intl`
 * (built into Node's ICU) — no date library, so these are testable with
 * zero installed dependencies and stay correct across DST changes.
 *
 * A grocery store cares about "today" in ITS local time, not UTC: a sale
 * at 11pm Eastern must count for that calendar day even though it's
 * already tomorrow in UTC. Every range below is a half-open UTC interval
 * [from, to) ready to hand straight to a Prisma `createdAt: { gte, lt }`
 * filter.
 */

/** { year, month (1-12), day } as seen on the wall clock in `timeZone` at instant `date`. */
function ymdInTz(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Minutes to ADD to a UTC timestamp to get local wall-clock time in `timeZone` (e.g. -240 for EDT). */
function tzOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60_000;
}

/** The UTC instant that is local midnight of the given Y-M-D calendar date in `timeZone`. */
function startOfDayInTz({ year, month, day }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMinutes = tzOffsetMinutes(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMinutes * 60_000);
}

function addDaysToYmd({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Monday-start ISO week number offset: 0 = today's Monday, negative = previous Mondays. */
function mondayOfWeek(ymd, timeZone) {
  const noon = startOfDayInTz(ymd, timeZone);
  noon.setUTCHours(12); // stay clear of any DST edge for the weekday lookup
  const isoWeekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(noon);
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const idx = order.indexOf(isoWeekday);
  return addDaysToYmd(ymd, -idx);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolves a named preset to a half-open [from, to) UTC range, evaluated
 * against `now` (defaults to the current instant) in `timeZone`.
 * Weeks run Monday–Sunday.
 */
function resolveRangePreset(preset, timeZone, now = new Date()) {
  const todayYmd = ymdInTz(now, timeZone);
  const todayStart = startOfDayInTz(todayYmd, timeZone);

  switch (preset) {
    case 'today':
      return { from: todayStart, to: new Date(todayStart.getTime() + DAY_MS) };

    case 'yesterday': {
      const yYmd = addDaysToYmd(todayYmd, -1);
      const from = startOfDayInTz(yYmd, timeZone);
      return { from, to: todayStart };
    }

    case 'this_week': {
      const mon = mondayOfWeek(todayYmd, timeZone);
      const from = startOfDayInTz(mon, timeZone);
      return { from, to: new Date(todayStart.getTime() + DAY_MS) };
    }

    case 'last_week': {
      const thisMon = mondayOfWeek(todayYmd, timeZone);
      const lastMon = addDaysToYmd(thisMon, -7);
      const from = startOfDayInTz(lastMon, timeZone);
      const to = startOfDayInTz(thisMon, timeZone);
      return { from, to };
    }

    case 'this_month': {
      const from = startOfDayInTz({ year: todayYmd.year, month: todayYmd.month, day: 1 }, timeZone);
      return { from, to: new Date(todayStart.getTime() + DAY_MS) };
    }

    case 'last_30_days': {
      const from = startOfDayInTz(addDaysToYmd(todayYmd, -29), timeZone);
      return { from, to: new Date(todayStart.getTime() + DAY_MS) };
    }

    default:
      throw new Error(`Unknown range preset: ${preset}`);
  }
}

/** Parses "YYYY-MM-DD" strings (inclusive on both ends) into a half-open [from, to) UTC range. */
function resolveCustomRange(fromStr, toStr, timeZone) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const from = startOfDayInTz({ year: fy, month: fm, day: fd }, timeZone);
  const toExclusive = startOfDayInTz(addDaysToYmd({ year: ty, month: tm, day: td }, 1), timeZone);
  return { from, to: toExclusive };
}

/** Splits [from, to) into daily buckets (as local Y-M-D labels) for trend charts. */
function dailyBucketLabels(from, to, timeZone) {
  const labels = [];
  let cursor = ymdInTz(from, timeZone);
  const endYmd = ymdInTz(new Date(to.getTime() - 1), timeZone); // -1ms: `to` itself is exclusive
  // eslint-disable-next-line no-constant-condition
  while (true) {
    labels.push(cursor);
    if (cursor.year === endYmd.year && cursor.month === endYmd.month && cursor.day === endYmd.day) break;
    cursor = addDaysToYmd(cursor, 1);
    if (labels.length > 3660) break; // safety valve against an accidental unbounded range
  }
  return labels;
}

function ymdToLabel({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

module.exports = {
  ymdInTz,
  tzOffsetMinutes,
  startOfDayInTz,
  addDaysToYmd,
  resolveRangePreset,
  resolveCustomRange,
  dailyBucketLabels,
  ymdToLabel,
};
