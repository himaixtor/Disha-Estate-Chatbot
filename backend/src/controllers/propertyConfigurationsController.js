const { getCmsPropertyConfigurations } = require('../services/cmsFiltersSyncService');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (_req, res) => {
  ok(res, await getCmsPropertyConfigurations());
});

module.exports = { list };
