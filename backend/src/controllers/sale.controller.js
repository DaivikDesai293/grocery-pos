const service = require('../services/sale.service');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const sale = await service.createSale(req.body, req.user);
  res.status(201).json(sale);
});

const list = asyncHandler(async (req, res) => {
  // Cashiers can only ever see their own sales history; managers/admins see everyone's.
  const query = req.user.role === 'CASHIER' ? { ...req.query, cashierId: req.user.id } : req.query;
  res.json(await service.list(query));
});
const getById = asyncHandler(async (req, res) => res.json(await service.getById(req.params.id)));

const voidSale = asyncHandler(async (req, res) => {
  const sale = await service.voidSale(req.params.id, req.body.reason, req.user.id);
  res.json(sale);
});

module.exports = { create, list, getById, voidSale };
