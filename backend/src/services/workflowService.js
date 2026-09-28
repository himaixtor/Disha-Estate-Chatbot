const { uuid } = require('../utils/uuid');
const sessionsRepo = require('../db/repositories/sessionsRepo');
const messagesRepo = require('../db/repositories/messagesRepo');
const categoriesRepo = require('../db/repositories/categoriesRepo');
const subcategoriesRepo = require('../db/repositories/subcategoriesRepo');
const serviceSectorsRepo = require('../db/repositories/serviceSectorsRepo');
const { isValidName, NAME_MAX_LENGTH } = require('./nameValidationService');
const { normalizeMobile } = require('./mobileService');
const otpService = require('./otpService');
const { registry } = require('../modules/registry');
const { ApiError } = require('../utils/apiResponse');

// The full target state machine (blueprint §D). AI_SCHEME_QA is reachable in
// the enum/schema but SHOW_RESULTS is where Release 1 actually stops — see
// chat.controller's ai stub route and § Module architecture.
const STATES = Object.freeze({
  WELCOME: 'WELCOME',
  COLLECT_NAME: 'COLLECT_NAME',
  VERIFY_NAME: 'VERIFY_NAME',
  COLLECT_MOBILE: 'COLLECT_MOBILE',
  SEND_OTP: 'SEND_OTP',
  VERIFY_OTP: 'VERIFY_OTP',
  PROPERTY_CATEGORY: 'PROPERTY_CATEGORY',
  PROPERTY_SUBCATEGORY: 'PROPERTY_SUBCATEGORY',
  LOCATION: 'LOCATION',
  VALIDATE_LOCATION: 'VALIDATE_LOCATION',
  LOCATION_UNSERVICEABLE: 'LOCATION_UNSERVICEABLE',
  MATCHING_INVENTORY: 'MATCHING_INVENTORY',
  NO_MATCH: 'NO_MATCH',
  SHOW_RESULTS: 'SHOW_RESULTS',
  AI_SCHEME_QA: 'AI_SCHEME_QA',
});
// Where BACK sends you from each state. States with no entry either can't go
// back (nothing to return to without discarding verified identity — blueprint
// §26 says back must never corrupt captured lead data) or aren't a place a
// user is ever waiting at BACK from.
const BACK_MAP = {
  [STATES.COLLECT_MOBILE]: STATES.COLLECT_NAME,
  [STATES.VERIFY_OTP]: STATES.COLLECT_MOBILE,
  [STATES.PROPERTY_SUBCATEGORY]: STATES.PROPERTY_CATEGORY,
  [STATES.LOCATION]: STATES.PROPERTY_SUBCATEGORY,
  [STATES.LOCATION_UNSERVICEABLE]: STATES.LOCATION,
  [STATES.NO_MATCH]: STATES.PROPERTY_CATEGORY,
  [STATES.SHOW_RESULTS]: STATES.LOCATION, // "Back to previous menu" after the results link
};

function assertState(session, ...allowed) {
  if (!allowed.includes(session.state)) {
    throw new ApiError(
      409,
      'INVALID_STATE',
      `This action isn't valid from the current step (${session.state}).`
    );
  }
}

// Category/sub-category/location steps are only for leads whose mobile
// number was actually verified via OTP — guards against any path (old
// Start over bug, stale widget, direct API calls) that skips verification.
function assertVerified(session) {
  if (!Number(session.lead_generated)) {
    throw new ApiError(409, 'NOT_VERIFIED', 'Please verify your mobile number first.');
  }
}

// Extra data the widget needs while waiting for an OTP.
function otpReplyMeta() {
  return { otpLength: otpService.OTP_LENGTH, resendAfterSeconds: otpService.OTP_RESEND_COOLDOWN_SECONDS };
}

async function reload(sessionId) {
  return sessionsRepo.findById(sessionId);
}

async function startSession() {
  const sessionId = uuid();
  await sessionsRepo.create({ sessionId });
  await messagesRepo.add({
    sessionId,
    responseType: 'bot',
    messageText: 'Hello! Welcome to our Property Portal.',
    isWelcome: true,
  });
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: 'May I know your full name?' });
  await sessionsRepo.updateFields(sessionId, { state: STATES.COLLECT_NAME });
  const session = await reload(sessionId);
  return { session, reply: { text: 'May I know your full name?', options: null } };
}

async function resumeSession(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  const history = await messagesRepo.listForSession(sessionId);
  return { session, history };
}

async function submitName(sessionId, rawName) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.COLLECT_NAME);

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: rawName });

  if (!isValidName(rawName)) {
    const text = String(rawName || '').trim().length > NAME_MAX_LENGTH
      ? `Please keep your name within ${NAME_MAX_LENGTH} characters.`
      : "That doesn't look like a full name — could you share your actual name?";
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: null } };
  }
  await sessionsRepo.updateFields(sessionId, { name: rawName.trim(), state: STATES.COLLECT_MOBILE });
  const text = `Nice to meet you, ${rawName.trim()}! Please share your WhatsApp mobile number for instant updates.`;
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return { session: await reload(sessionId), reply: { text, options: null } };
}

async function submitMobile(sessionId, rawMobile) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.COLLECT_MOBILE);

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: rawMobile });

  const normalized = normalizeMobile(rawMobile);
  if (!normalized) {
    const text = 'That doesn’t look like a valid Indian mobile number — please share a 10-digit number starting with 6, 7, 8 or 9.';
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: null } };
  }

  await sessionsRepo.updateFields(sessionId, { mobileNumber: normalized, state: STATES.SEND_OTP });

  try {
    await otpService.sendOtp({ sessionId, mobileNumber: normalized, name: session.name });
  } catch (err) {
    if (err.code === 'OTP_SEND_LIMIT') {
      await sessionsRepo.updateFields(sessionId, { state: STATES.COLLECT_MOBILE });
      await messagesRepo.add({ sessionId, responseType: 'bot', messageText: err.message });
      return { session: await reload(sessionId), reply: { text: err.message, options: null } };
    }
    // Provider failure — roll back to COLLECT_MOBILE (blueprint §D, Fig. D1:
    // "SEND_OTP --> COLLECT_MOBILE: provider failure") instead of leaving the
    // session stranded in SEND_OTP, a state no handler accepts input from.
    // eslint-disable-next-line no-console
    console.error(`[workflowService] OTP send failed for session ${sessionId}:`, err.message);
    await sessionsRepo.updateFields(sessionId, { state: STATES.COLLECT_MOBILE });
    const text = "We couldn't send a verification code to that number right now. Please share your WhatsApp mobile number again, or try again in a moment.";
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: null } };
  }

  await sessionsRepo.updateFields(sessionId, { state: STATES.VERIFY_OTP });

  const text = `We sent a ${otpService.OTP_LENGTH}-digit verification code to ${normalized} on WhatsApp.`;
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return { session: await reload(sessionId), reply: { text, options: null, ...otpReplyMeta() } };
}

// "Resend OTP" — same number, new code (the latest code is the only one
// verifyOtp checks, so the previous one stops working). Cooldown + per-session
// cap are enforced in otpService.
async function resendOtp(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.VERIFY_OTP);

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: 'Resend OTP' });
  try {
    await otpService.sendOtp({ sessionId, mobileNumber: session.mobile_number, name: session.name, enforceCooldown: true });
  } catch (err) {
    if (err.code === 'OTP_RESEND_TOO_SOON' || err.code === 'OTP_SEND_LIMIT') {
      await messagesRepo.add({ sessionId, responseType: 'bot', messageText: err.message });
      const retryAfter = Number(err.details?.[0]?.message) || 0;
      return {
        session: await reload(sessionId),
        reply: { text: err.message, options: null, ...otpReplyMeta(), resendAfterSeconds: err.code === 'OTP_SEND_LIMIT' ? null : retryAfter },
      };
    }
    // eslint-disable-next-line no-console
    console.error(`[workflowService] OTP resend failed for session ${sessionId}:`, err.message);
    const text = "We couldn't resend the code right now. Please try again in a moment.";
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: null, ...otpReplyMeta(), resendAfterSeconds: 0 } };
  }

  const text = `We've sent a new ${otpService.OTP_LENGTH}-digit code to ${session.mobile_number}. The earlier code will no longer work.`;
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return { session: await reload(sessionId), reply: { text, options: null, ...otpReplyMeta() } };
}

// "Change number" — user spotted a typo in their mobile number while waiting
// for the OTP. Goes back to COLLECT_MOBILE; submitting the corrected number
// sends a fresh OTP to it via submitMobile.
async function changeMobile(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.VERIFY_OTP, STATES.COLLECT_MOBILE);

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: 'Change mobile number' });
  await sessionsRepo.updateFields(sessionId, { state: STATES.COLLECT_MOBILE });
  const text = 'No problem — please enter the correct 10-digit WhatsApp mobile number.';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return { session: await reload(sessionId), reply: { text, options: null } };
}

async function verifyOtp(sessionId, code) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.VERIFY_OTP);

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: '••••' }); // never store the OTP text itself

  try {
    await otpService.verifyOtp({ sessionId, code });
  } catch (err) {
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: err.message });

    if (err.code === 'OTP_ATTEMPTS_EXHAUSTED') {
      // 5 wrong codes in a row — don't leave the user stuck re-guessing
      // against the same exhausted code. Send them back to COLLECT_MOBILE
      // so re-submitting their number issues a fresh OTP (blueprint §D:
      // "VERIFY_OTP --> COLLECT_MOBILE: attempts exhausted").
      await sessionsRepo.updateFields(sessionId, { state: STATES.COLLECT_MOBILE });
      const text = 'Please share your WhatsApp mobile number again to receive a new verification code.';
      await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
      return { session: await reload(sessionId), reply: { text, options: null } };
    }

    throw err;
  }

  await sessionsRepo.updateFields(sessionId, { state: STATES.PROPERTY_CATEGORY, leadGenerated: 1, leadStatus: 'verified' });
  const categories = await categoriesRepo.listActive();
  const text = 'Mobile verified successfully! What type of property are you looking for?';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: { text, options: categories.map((c) => ({ id: c.id, label: c.name })) },
  };
}

async function selectCategory(sessionId, categoryId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.PROPERTY_CATEGORY, STATES.NO_MATCH);
  assertVerified(session);

  const category = await categoriesRepo.findById(categoryId);
  if (!category || !category.is_active) throw new ApiError(400, 'INVALID_CATEGORY', 'Please pick one of the listed options.');

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: category.name });
  await sessionsRepo.updateFields(sessionId, { categoryId, subcategoryId: null, state: STATES.PROPERTY_SUBCATEGORY });

  const subcategories = await subcategoriesRepo.listActiveByCategory(categoryId);
  const text = `Please select a ${category.name} option:`;
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: { text, options: subcategories.map((s) => ({ id: s.id, label: s.name })) },
  };
}

async function selectSubcategory(sessionId, subcategoryId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.PROPERTY_SUBCATEGORY);
  assertVerified(session);

  const subcategory = await subcategoriesRepo.findById(subcategoryId);
  if (!subcategory || !subcategory.is_active || subcategory.category_id !== session.category_id) {
    throw new ApiError(400, 'INVALID_SUBCATEGORY', 'Please pick one of the listed options.');
  }

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: subcategory.name });
  await sessionsRepo.updateFields(sessionId, { subcategoryId, state: STATES.LOCATION });

  const text = 'Which preferred location or locality are you targeting?';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  const sectors = await serviceSectorsRepo.listActive();
  return {
    session: await reload(sessionId),
    reply: { text, options: sectors.map((s) => ({ id: s.id, label: s.sector_name })).concat([{ id: null, label: 'Other' }]) },
  };
}

async function submitLocation(sessionId, { serviceSectorId, locationText }) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.LOCATION, STATES.LOCATION_UNSERVICEABLE);
  assertVerified(session);

  await sessionsRepo.updateFields(sessionId, { state: STATES.VALIDATE_LOCATION });

  let matchedSector = null;
  if (serviceSectorId) {
    const sectors = await serviceSectorsRepo.listActive();
    matchedSector = sectors.find((s) => s.id === serviceSectorId) || null;
  } else if (locationText) {
    await messagesRepo.add({ sessionId, responseType: 'user', messageText: locationText });
    matchedSector = await serviceSectorsRepo.findByNameOrAreaCode(locationText.trim());
  }

  if (!matchedSector) {
    await sessionsRepo.updateFields(sessionId, { state: STATES.LOCATION_UNSERVICEABLE, serviceSectorId: null });
    const text = `We are not providing service at this moment in your preferred area ${locationText || ''}. Hope we will start serving soon.`;
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: [{ id: 'retry', label: 'Try another area' }] } };
  }

  if (!locationText) {
    await messagesRepo.add({ sessionId, responseType: 'user', messageText: matchedSector.sector_name });
  }
  await sessionsRepo.updateFields(sessionId, { serviceSectorId: matchedSector.id, state: STATES.MATCHING_INVENTORY });

  const text = 'Matching inventory based on your preferences...';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return matchInventory(sessionId);
}

async function matchInventory(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.MATCHING_INVENTORY);

  if (!registry.inventory) {
    throw new ApiError(503, 'MODULE_DISABLED', 'Property inventory matching is not enabled.');
  }

  const category = session.category_id ? await categoriesRepo.findById(session.category_id) : null;
  const subcategory = session.subcategory_id ? await subcategoriesRepo.findById(session.subcategory_id) : null;
  const sectors = await serviceSectorsRepo.listActive();
  const sector = sectors.find((s) => s.id === session.service_sector_id);

  const result = await registry.inventory.findMatches({
    category: category?.name,
    subCategory: subcategory?.name,
    location: sector?.sector_name,
  });

  if (!result.matched) {
    await sessionsRepo.updateFields(sessionId, { state: STATES.NO_MATCH });
    const text = "We couldn't find matching properties for that combination just yet. Would you like to adjust your preferences?";
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: [{ id: 'retry', label: 'Adjust preferences' }] } };
  }

  await sessionsRepo.updateFields(sessionId, { state: STATES.SHOW_RESULTS, leadStatus: 'matched' });
  const text = 'I found matching properties based on your preferences. Would you like me to open the results in a new tab?';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: { text, options: [{ id: 'open', label: 'Open Results' }, { id: 'link', label: 'Get Link' }], resultUrl: result.resultUrl },
  };
}

async function goBack(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');

  const previous = BACK_MAP[session.state];
  if (!previous) {
    const text = "You can't go back from this step.";
    return { session, reply: { text, options: null } };
  }

  await sessionsRepo.updateFields(sessionId, { state: previous });
  return reenterState(sessionId, previous);
}

async function reenterState(sessionId, state) {
  const session = await reload(sessionId);
  switch (state) {
    case STATES.COLLECT_NAME:
      return { session, reply: { text: 'May I know your full name?', options: null } };
    case STATES.COLLECT_MOBILE:
      return { session, reply: { text: 'Please share your WhatsApp mobile number.', options: null } };
    case STATES.PROPERTY_CATEGORY: {
      const categories = await categoriesRepo.listActive();
      return { session, reply: { text: 'What type of property are you looking for?', options: categories.map((c) => ({ id: c.id, label: c.name })) } };
    }
    case STATES.PROPERTY_SUBCATEGORY: {
      const subcategories = await subcategoriesRepo.listActiveByCategory(session.category_id);
      return { session, reply: { text: 'Please pick an option:', options: subcategories.map((s) => ({ id: s.id, label: s.name })) } };
    }
    case STATES.LOCATION: {
      const sectors = await serviceSectorsRepo.listActive();
      return { session, reply: { text: 'Which preferred location or locality are you targeting?', options: sectors.map((s) => ({ id: s.id, label: s.sector_name })).concat([{ id: null, label: 'Other' }]) } };
    }
    default:
      return { session, reply: { text: 'Let’s continue.', options: null } };
  }
}

// "Back to main menu" — shown after the results link and on "no match".
// Keeps the verified identity (name + mobile), clears the property
// preferences and returns to category selection — never deletes lead data
// (blueprint §26). Only available once the mobile number is verified.
async function mainMenu(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertVerified(session);

  await sessionsRepo.updateFields(sessionId, {
    categoryId: null, subcategoryId: null, serviceSectorId: null, state: STATES.PROPERTY_CATEGORY,
  });
  await messagesRepo.add({ sessionId, responseType: 'user', messageText: 'Back to main menu' });
  return reenterState(sessionId, STATES.PROPERTY_CATEGORY);
}

module.exports = {
  STATES,
  startSession,
  resumeSession,
  submitName,
  submitMobile,
  verifyOtp,
  resendOtp,
  changeMobile,
  selectCategory,
  selectSubcategory,
  submitLocation,
  matchInventory,
  goBack,
  mainMenu,
};
