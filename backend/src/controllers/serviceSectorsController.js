const serviceSectorsRepo = require('../db/repositories/serviceSectorsRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listPublic = asyncHandler(async (req, res) => {
  if (req.query.q) return ok(res, await serviceSectorsRepo.search(req.query.q));
  ok(res, await serviceSectorsRepo.listActive());
});

const listAdmin = asyncHandler(async (req, res) => ok(res, await serviceSectorsRepo.listAll()));

const create = asyncHandler(async (req, res) => {
  const id = await serviceSectorsRepo.create(req.body);
  ok(res, { id }, 'Service sector created.', 201);
});

const update = asyncHandler(async (req, res) => {
  await serviceSectorsRepo.update(req.params.id, req.body);
  ok(res, {}, 'Service sector updated.');
});

module.exports = { listPublic, listAdmin, create, update };
