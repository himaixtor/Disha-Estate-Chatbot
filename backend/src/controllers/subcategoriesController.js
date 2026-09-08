const subcategoriesRepo = require('../db/repositories/subcategoriesRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listAdmin = asyncHandler(async (req, res) => ok(res, await subcategoriesRepo.listAll()));

const create = asyncHandler(async (req, res) => {
  const id = await subcategoriesRepo.create(req.body);
  ok(res, { id }, 'Subcategory created.', 201);
});

const update = asyncHandler(async (req, res) => {
  await subcategoriesRepo.update(req.params.id, req.body);
  ok(res, {}, 'Subcategory updated.');
});

module.exports = { listAdmin, create, update };
