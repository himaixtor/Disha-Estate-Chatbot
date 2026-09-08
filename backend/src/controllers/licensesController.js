const licensesRepo = require('../db/repositories/licensesRepo');
const licenseService = require('../services/licenseService');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => ok(res, await licensesRepo.list()));

const create = asyncHandler(async (req, res) => {
  const id = await licensesRepo.create({ ...req.body, createdBy: req.user.uid });
  ok(res, { id }, 'License created.', 201);
});

const setStatus = (status) => asyncHandler(async (req, res) => {
  await licensesRepo.setStatus(req.params.id, status);
  ok(res, {}, `License ${status}.`);
});

const validate = asyncHandler(async (req, res) => {
  const result = await licenseService.validate(req.params.licenseId, req.query.environment);
  ok(res, result);
});

module.exports = { list, create, activate: setStatus('active'), suspend: setStatus('suspended'), renew: setStatus('active'), validate };
