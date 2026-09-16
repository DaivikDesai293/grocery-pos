const reportService = require('./report.service');

/**
 * One combined payload for the mobile app's home screen (and the web
 * dashboard's top section) — a single round trip instead of six, which
 * matters more on a phone's network than on the web admin console.
 */
async function overview() {
  const [today, yesterday, thisWeek, lastWeek, trend30, reorder] = await Promise.all([
    reportService.summary({ preset: 'today' }),
    reportService.summary({ preset: 'yesterday' }),
    reportService.summary({ preset: 'this_week' }),
    reportService.summary({ preset: 'last_week' }),
    reportService.trend({ preset: 'last_30_days' }),
    reportService.reorderReport(),
  ]);

  return {
    today,
    yesterday,
    thisWeek,
    lastWeek,
    trend: trend30.days,
    lowStockCount: reorder.length,
    reorderPreview: reorder.slice(0, 5),
  };
}

module.exports = { overview };
