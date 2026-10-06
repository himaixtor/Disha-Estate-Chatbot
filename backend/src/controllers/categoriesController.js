const categoriesRepo = require('../db/repositories/categoriesRepo');
const subcategoriesRepo = require('../db/repositories/subcategoriesRepo');
const { syncCmsFilters } = require('../services/cmsFiltersSyncService');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listPublic = asyncHandler(async (req, res) => ok(res, await categoriesRepo.listActive()));
const listAdmin = asyncHandler(async (req, res) => ok(res, await categoriesRepo.listAll()));
const sync = asyncHandler(async (req, res) => {
  const counts = await syncCmsFilters();
  ok(res, counts, 'CMS categories and locations synced.');
});

const create = asyncHandler(async (req, res) => {
  const id = await categoriesRepo.create(req.body);
  ok(res, { id }, 'Category created.', 201);
});

const update = asyncHandler(async (req, res) => {
  await categoriesRepo.update(req.params.id, req.body);
  ok(res, {}, 'Category updated.');
});

const subcategoriesForCategory = asyncHandler(async (req, res) => {
  ok(res, await subcategoriesRepo.listActiveByCategory(req.params.id));
});

module.exports = { listPublic, listAdmin, sync, create, update, subcategoriesForCategory };
