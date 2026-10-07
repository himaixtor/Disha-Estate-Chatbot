const workflow = require('../services/workflowService');
const messagesRepo = require('../db/repositories/messagesRepo');
const { ok } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

function serializeIds(value, fallbackId) {
  let ids = value;
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids); } catch (_err) { ids = null; }
  }
  if (!Array.isArray(ids)) ids = fallbackId == null ? [] : [fallbackId];
  return [...new Set(ids.map(Number).filter(Number.isInteger))];
}

function serializeSession(session) {
  return {
    sessionId: session.session_id,
    state: session.state,
    name: session.name,
    mobileNumber: session.mobile_number,
    categoryId: session.category_id,
    categoryIds: serializeIds(session.category_ids, session.category_id),
    subcategoryId: session.subcategory_id,
    subcategoryIds: serializeIds(session.subcategory_ids, session.subcategory_id),
    configurationIds: parseStringArray(session.configuration_ids),
    configurationValues: parseStringArray(session.configuration_values),
    serviceSectorId: session.service_sector_id,
    serviceSectorIds: serializeIds(session.service_sector_ids, session.service_sector_id),
    leadStatus: session.lead_status,
  };
}

function parseStringArray(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_err) { value = null; }
  }
  return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : [];
}

const createSession = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.startSession();
  ok(res, { session: serializeSession(session), reply }, 'Session started.', 201);
});

const getSession = asyncHandler(async (req, res) => {
  const { session, history, reply } = await workflow.resumeSession(req.params.id);
  ok(res, {
    session: serializeSession(session),
    // Only what the widget needs to redraw the conversation.
    history: history
      .filter((m) => m.response_type === 'user' || m.response_type === 'bot')
      .map((m) => ({ sender: m.response_type, text: m.message_text, timestamp: m.timestamp })),
    reply,
  });
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
  const categoryIds = req.body.categoryIds || [req.body.categoryId];
  const { session, reply } = await workflow.selectCategory(req.params.id, categoryIds);
  ok(res, { session: serializeSession(session), reply });
});

const selectSubcategory = asyncHandler(async (req, res) => {
  const subcategoryIds = req.body.subcategoryIds || [req.body.subcategoryId];
  const { session, reply } = await workflow.selectSubcategory(req.params.id, subcategoryIds);
  ok(res, { session: serializeSession(session), reply });
});

const selectConfiguration = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.selectConfiguration(req.params.id, req.body.configurationIds);
  ok(res, { session: serializeSession(session), reply });
});

const submitLocation = asyncHandler(async (req, res) => {
  const { session, reply } = await workflow.submitLocation(req.params.id, {
    serviceSectorIds: req.body.serviceSectorIds || (req.body.serviceSectorId == null ? [] : [req.body.serviceSectorId]),
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
  selectCategory, selectSubcategory, selectConfiguration, submitLocation, goBack, mainMenu,
};
