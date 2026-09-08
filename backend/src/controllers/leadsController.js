const sessionsRepo = require('../db/repositories/sessionsRepo');
const messagesRepo = require('../db/repositories/messagesRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const { rows, total } = await sessionsRepo.list({
    limit,
    offset,
    leadStatus: req.query.status,
    categoryId: req.query.categoryId,
    search: req.query.search,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  });
  ok(res, { items: rows, total, limit, offset });
});

const detail = asyncHandler(async (req, res) => {
  const session = await sessionsRepo.findById(req.params.sessionId);
  const history = await messagesRepo.listForSession(req.params.sessionId);
  ok(res, { session, history });
});

const update = asyncHandler(async (req, res) => {
  const fields = {};
  if (req.body.isPinned !== undefined) fields.isPinned = req.body.isPinned ? 1 : 0;
  if (req.body.deletedByOwner !== undefined) fields.deletedByOwner = req.body.deletedByOwner ? 1 : 0;
  if (req.body.leadStatus !== undefined) fields.leadStatus = req.body.leadStatus;
  await sessionsRepo.updateFields(req.params.sessionId, fields);
  ok(res, {}, 'Lead updated.');
});

module.exports = { list, detail, update };
