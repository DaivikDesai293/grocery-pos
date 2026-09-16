const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  res.json(await userService.list());
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json(await userService.create(req.body));
});

const update = asyncHandler(async (req, res) => {
  res.json(await userService.update(req.params.id, req.body));
});

const deactivate = asyncHandler(async (req, res) => {
  res.json(await userService.deactivate(req.params.id, req.user.id));
});

module.exports = { list, create, update, deactivate };
