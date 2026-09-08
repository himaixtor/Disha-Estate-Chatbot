const { uuid } = require('../utils/uuid');
const sessionsRepo = require('../db/repositories/sessionsRepo');
const messagesRepo = require('../db/repositories/messagesRepo');
const categoriesRepo = require('../db/repositories/categoriesRepo');
const subcategoriesRepo = require('../db/repositories/subcategoriesRepo');
const serviceSectorsRepo = require('../db/repositories/serviceSectorsRepo');
const { isValidName } = require('./nameValidationService');
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
    const text = "That doesn't look like a full name — could you share your actual name?";
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
    const text = 'That number doesn’t look valid — please share a 10-digit mobile number.';
    await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
    return { session: await reload(sessionId), reply: { text, options: null } };
  }

  await sessionsRepo.updateFields(sessionId, { mobileNumber: normalized, state: STATES.SEND_OTP });

  try {
    const response = await otpService.sendOtp({ sessionId, mobileNumber: normalized });
    console.log("whatsapp otp response", response);
  } catch (err) {
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

  const text = `We sent a 4-digit verification code to ${normalized}.`;
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
    sessionId,
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
    const text = "You're already past that step — use Start Over if you'd like to begin again from scratch.";
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

async function startOver(sessionId) {
  const existing = await sessionsRepo.findById(sessionId);
  if (!existing) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');

  // Keeps identity (name/mobile already verified) but clears preference
  // selections and rewinds to the category step — never deletes lead data
  // (blueprint §26).
  await sessionsRepo.updateFields(sessionId, {
    categoryId: null,
    subcategoryId: null,
    serviceSectorId: null,
    state: existing.mobile_number ? STATES.PROPERTY_CATEGORY : STATES.COLLECT_NAME,
  });
  return reenterState(sessionId, existing.mobile_number ? STATES.PROPERTY_CATEGORY : STATES.COLLECT_NAME);
}

module.exports = {
  STATES,
  startSession,
  resumeSession,
  submitName,
  submitMobile,
  verifyOtp,
  selectCategory,
  selectSubcategory,
  submitLocation,
  matchInventory,
  goBack,
  startOver,
};
