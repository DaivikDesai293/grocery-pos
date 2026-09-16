const service = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');

const overview = asyncHandler(async (req, res) => res.json(await service.overview()));

module.exports = { overview };
