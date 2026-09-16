const service = require('../services/setting.service');
const asyncHandler = require('../utils/asyncHandler');

const get = asyncHandler(async (req, res) => res.json(await service.get()));
const update = asyncHandler(async (req, res) => res.json(await service.update(req.body)));

module.exports = { get, update };
