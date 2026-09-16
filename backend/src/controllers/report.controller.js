const service = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');

const summary = asyncHandler(async (req, res) => res.json(await service.summary(req.query)));
const trend = asyncHandler(async (req, res) => res.json(await service.trend(req.query)));
const topProducts = asyncHandler(async (req, res) => res.json(await service.topProducts(req.query)));
const byCategory = asyncHandler(async (req, res) => res.json(await service.byCategory(req.query)));
const byCashier = asyncHandler(async (req, res) => res.json(await service.byCashier(req.query)));
const reorder = asyncHandler(async (req, res) => res.json(await service.reorderReport()));

module.exports = { summary, trend, topProducts, byCategory, byCashier, reorder };
