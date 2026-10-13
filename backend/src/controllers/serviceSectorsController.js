const serviceSectorsRepo = require('../db/repositories/serviceSectorsRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const listPublic = asyncHandler(async (req, res) => {
  if (req.query.q) return ok(res, await serviceSectorsRepo.search(req.query.q));
  ok(res, await serviceSectorsRepo.listActive());
});

const listAdmin = asyncHandler(async (req, res) => {
  if (req.query.limit === undefined && req.query.offset === undefined && req.query.search === undefined) {
    return ok(res, await serviceSectorsRepo.listAll());
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  ok(res, await serviceSectorsRepo.listAll({ limit, offset, search }));
});

const create = asyncHandler(async (req, res) => {
  const id = await serviceSectorsRepo.create(req.body);
  ok(res, { id }, 'Service sector created.', 201);
});

const update = asyncHandler(async (req, res) => {
  await serviceSectorsRepo.update(req.params.id, req.body);
  ok(res, {}, 'Service sector updated.');
});

module.exports = { listPublic, listAdmin, create, update };
