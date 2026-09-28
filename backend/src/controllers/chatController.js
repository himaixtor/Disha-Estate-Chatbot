const workflow = require('../services/workflowService');
const messagesRepo = require('../db/repositories/messagesRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

function serializeSession(session) {
  return {
    sessionId: session.session_id,
    state: session.state,
    name: session.name,
    mobileNumber: session.mobile_number,
    categoryId: session.category_id,
    subcategoryId: session.subcategory_id,
    serviceSectorId: session.service_sector_id,
    leadStatus: session.lead_status,
  };
}

const createSession = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.startSession();
  ok(res, { session: serializeSession(session), reply }, 'Session started.', 201);
});

const getSession = asyncHandler(async (req, res) => {
  const { session, history } = await workflow.resumeSession(req.params.id);
  ok(res, { session: serializeSession(session), history });
});

const submitName = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.submitName(req.params.id, req.body.name);
  ok(res, { session: serializeSession(session), reply });
});

const submitMobile = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.submitMobile(req.params.id, req.body.mobileNumber);
  ok(res, { session: serializeSession(session), reply });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.verifyOtp(req.params.id, req.body.code);
  ok(res, { session: serializeSession(session), reply });
});

const resendOtp = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.resendOtp(req.params.id);
  ok(res, { session: serializeSession(session), reply });
});

const changeMobile = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.changeMobile(req.params.id);
  ok(res, { session: serializeSession(session), reply });
});

const selectCategory = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.selectCategory(req.params.id, req.body.categoryId);
  ok(res, { session: serializeSession(session), reply });
});

const selectSubcategory = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.selectSubcategory(req.params.id, req.body.subcategoryId);
  ok(res, { session: serializeSession(session), reply });
});

const submitLocation = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.submitLocation(req.params.id, {
    serviceSectorId: req.body.serviceSectorId || null,
    locationText: req.body.locationText || null,
  });
  ok(res, { session: serializeSession(session), reply });
});

const goBack = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.goBack(req.params.id);
  ok(res, { session: serializeSession(session), reply });
});

const mainMenu = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.mainMenu(req.params.id);
  ok(res, { session: serializeSession(session), reply });
});

module.exports = {
  createSession, getSession, submitName, submitMobile, verifyOtp, resendOtp, changeMobile,
  selectCategory, selectSubcategory, submitLocation, goBack, mainMenu,
};
