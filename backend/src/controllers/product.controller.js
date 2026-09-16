const service = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => res.json(await service.list(req.query)));
const getById = asyncHandler(async (req, res) => res.json(await service.getById(req.params.id)));
const getByBarcode = asyncHandler(async (req, res) =>
  res.json(await service.getByBarcode(req.params.barcode))
);
const create = asyncHandler(async (req, res) => res.status(201).json(await service.create(req.body)));
const update = asyncHandler(async (req, res) => res.json(await service.update(req.params.id, req.body)));
const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});
const adjustStock = asyncHandler(async (req, res) =>
  res.json(await service.adjustStock(req.params.id, req.body, req.user.id))
);
const stockHistory = asyncHandler(async (req, res) =>
  res.json(await service.stockHistory(req.params.id))
);

module.exports = { list, getById, getByBarcode, create, update, remove, adjustStock, stockHistory };
