const { uuid } = require('../utils/uuid');
const sessionsRepo = require('../db/repositories/sessionsRepo');
const messagesRepo = require('../db/repositories/messagesRepo');
const categoriesRepo = require('../db/repositories/categoriesRepo');
const subcategoriesRepo = require('../db/repositories/subcategoriesRepo');
const serviceSectorsRepo = require('../db/repositories/serviceSectorsRepo');
const { getCmsPropertyConfigurations } = require('./cmsFiltersSyncService');
const { isValidName, NAME_MAX_LENGTH } = require('./nameValidationService');
const { normalizeMobile } = require('./mobileService');
const otpService = require('./otpService');
const otpRepo = require('../db/repositories/otpRepo');
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
  PROPERTY_CONFIGURATION: 'PROPERTY_CONFIGURATION',
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
  [STATES.PROPERTY_CONFIGURATION]: STATES.PROPERTY_SUBCATEGORY,
  [STATES.LOCATION]: STATES.PROPERTY_CONFIGURATION,
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

function selectedIds(value, fallbackId) {
  let ids = value;
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids); } catch (_err) { ids = null; }
  }
  if (!Array.isArray(ids)) ids = fallbackId == null ? [] : [fallbackId];
  return [...new Set(ids.map(Number).filter(Number.isInteger))];
}

async function belongsToSelectedCategory(category, selectedCategoryIds) {
  let current = category;
  const visited = new Set();
  while (current?.parent_id != null) {
    const parentId = Number(current.parent_id);
    if (selectedCategoryIds.includes(parentId)) return true;
    if (visited.has(parentId)) return false;
    visited.add(parentId);
    current = await categoriesRepo.findById(parentId);
  }
  return false;
}

function selectedStrings(value) {
  let values = value;
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch (_err) { values = null; }
  }
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))];
}

function configurationOptions(configurations, categoryIds) {
  const allowedCategoryIds = new Set(categoryIds.map(Number));
  return configurations
    .filter((item) => (
      allowedCategoryIds.has(Number(item.category_id))
      && typeof item.name === 'string' && item.name.trim()
      && typeof item.slug === 'string' && item.slug.trim()
    ))
    .map((item) => ({
      id: `${Number(item.category_id)}:${item.slug}`,
      label: item.name.trim(),
      categoryId: Number(item.category_id),
    }));
}

async function getConfigurationOptions(categoryIds) {
  return configurationOptions(await getCmsPropertyConfigurations(), categoryIds);
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

// A chat can be picked up again (after a refresh, or on another page of the
// site) for this long after it started. The widget's cookie uses the same TTL.
const SESSION_RESUME_TTL_SECONDS = 24 * 60 * 60;

// Returns the full visible history plus what the widget must show for the
// current step (options, OTP buttons, results link) so it can rebuild the
// chat exactly where the user left it.
async function resumeSession(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  const age = await sessionsRepo.ageSeconds(sessionId);
  if (age != null && age >= SESSION_RESUME_TTL_SECONDS) {
    throw new ApiError(410, 'SESSION_EXPIRED', 'This chat has expired. Please start a new one.');
  }
  const history = await messagesRepo.listForSession(sessionId);
  return { session, history, reply: await currentPrompt(session) };
}

// Options/extra data for the step the session is currently waiting at —
// same shape as the `reply` every step returns, minus any new message text.
async function currentPrompt(session) {
  const none = { text: null, options: null };
  switch (session.state) {
    case STATES.VERIFY_OTP: {
      const { sentCount, secondsSinceLast } = await otpRepo.sendStats(session.session_id);
      const limitReached = sentCount >= otpService.OTP_MAX_SENDS_PER_SESSION;
      const wait = secondsSinceLast == null ? 0 : Math.max(0, otpService.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast);
      return { ...none, otpLength: otpService.OTP_LENGTH, resendAfterSeconds: limitReached ? null : wait };
    }
    case STATES.PROPERTY_CATEGORY:
    case STATES.PROPERTY_SUBCATEGORY:
    case STATES.PROPERTY_CONFIGURATION:
    case STATES.LOCATION: {
      const { reply } = await reenterState(session.session_id, session.state);
      return { ...none, options: reply.options };
    }
    case STATES.LOCATION_UNSERVICEABLE:
      return { ...none, options: [{ id: 'retry', label: 'Try another area' }] };
    case STATES.NO_MATCH:
      return { ...none, options: [{ id: 'retry', label: 'Adjust preferences' }] };
    case STATES.SHOW_RESULTS: {
      const categoryIds = selectedIds(session.category_ids, session.category_id);
      const subcategoryIds = selectedIds(session.subcategory_ids, session.subcategory_id);
      const configurations = selectedStrings(session.configuration_values);
      const sectorIds = selectedIds(session.service_sector_ids, session.service_sector_id);
      const categories = await Promise.all(categoryIds.map((id) => categoriesRepo.findById(id)));
      const subcategories = await Promise.all(subcategoryIds.map((id) => subcategoriesRepo.findById(id)));
      const sectors = (await serviceSectorsRepo.listActive()).filter((sector) => sectorIds.includes(sector.id));
      const result = registry.inventory
        ? await registry.inventory.findMatches({
          category: categories.filter(Boolean).map((category) => category.cms_slug || category.name),
          propertyCategory: subcategories.filter(Boolean).map((subcategory) => subcategory.cms_slug || subcategory.name),
          configuration: configurations,
          location: sectors.map((sector) => sector.slug),
        })
        : {};
      return {
        ...none,
        options: [{ id: 'open', label: 'Open Results' }, { id: 'link', label: 'Get Link' }],
        resultUrl: result.resultUrl,
        properties: result.properties || [],
      };
    }
    default:
      return none;
  }
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
    const text = 'That doesn’t look like a valid mobile number for the selected country — please check and try again.';
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

async function selectCategory(sessionId, rawCategoryIds) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.PROPERTY_CATEGORY, STATES.NO_MATCH);
  assertVerified(session);

  const categoryIds = selectedIds(rawCategoryIds);
  if (!categoryIds.length) throw new ApiError(400, 'INVALID_CATEGORY', 'Please pick at least one of the listed options.');
  const categories = await Promise.all(categoryIds.map((id) => categoriesRepo.findById(id)));
  if (categories.some((category) => !category || !category.is_active)) {
    throw new ApiError(400, 'INVALID_CATEGORY', 'Please pick from the listed options.');
  }

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: categories.map((category) => category.name).join(', ') });
  await sessionsRepo.updateFields(sessionId, {
    categoryId: categoryIds[0], categoryIds, subcategoryId: null, subcategoryIds: [],
    configurationIds: [], configurationValues: [], state: STATES.PROPERTY_SUBCATEGORY,
  });

  const subcategories = (await Promise.all(categoryIds.map((id) => subcategoriesRepo.listActiveLeafOptionsByCategory(id))))
    .flat()
    .filter((subcategory, index, all) => all.findIndex((item) => item.id === subcategory.id) === index);
  const text = categoryIds.length === 1
    ? `Please select a ${categories[0].name} option:`
    : 'Please select one or more property options:';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: {
      text,
      options: subcategories.map((subcategory) => ({
        id: subcategory.id,
        label: categoryIds.length > 1 ? `${categories.find((category) => category.id === subcategory.root_category_id)?.name}: ${subcategory.path}` : subcategory.path,
        categoryId: subcategory.root_category_id,
      })),
    },
  };
}

async function selectSubcategory(sessionId, rawSubcategoryIds) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.PROPERTY_SUBCATEGORY);
  assertVerified(session);

  const categoryIds = selectedIds(session.category_ids, session.category_id);
  const subcategoryIds = selectedIds(rawSubcategoryIds);
  if (!subcategoryIds.length) throw new ApiError(400, 'INVALID_SUBCATEGORY', 'Please pick at least one of the listed options.');
  const subcategories = await Promise.all(subcategoryIds.map((id) => subcategoriesRepo.findById(id)));
  const validParents = await Promise.all(subcategories.map((subcategory) => (
    subcategory ? belongsToSelectedCategory(subcategory, categoryIds) : false
  )));
  if (subcategories.some((subcategory, index) => !subcategory || !subcategory.is_active || !validParents[index])) {
    throw new ApiError(400, 'INVALID_SUBCATEGORY', 'Please pick from the listed options.');
  }

  await messagesRepo.add({ sessionId, responseType: 'user', messageText: subcategories.map((subcategory) => subcategory.name).join(', ') });
  await sessionsRepo.updateFields(sessionId, {
    subcategoryId: subcategoryIds[0], subcategoryIds, configurationIds: [], configurationValues: [],
  });

  const options = await getConfigurationOptions(categoryIds);
  const state = options.length ? STATES.PROPERTY_CONFIGURATION : STATES.LOCATION;
  await sessionsRepo.updateFields(sessionId, { state });
  const text = options.length
    ? 'Please select your property configuration:'
    : 'Which preferred location or locality are you targeting?';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: { text, options: options.length ? options : await locationOptions() },
  };
}

async function selectConfiguration(sessionId, rawConfigurationIds) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.PROPERTY_CONFIGURATION);
  assertVerified(session);

  const categoryIds = selectedIds(session.category_ids, session.category_id);
  const selectedConfigurationIds = selectedStrings(rawConfigurationIds);
  if (!selectedConfigurationIds.length) {
    throw new ApiError(400, 'INVALID_CONFIGURATION', 'Please select at least one property configuration.');
  }
  const options = await getConfigurationOptions(categoryIds);
  const selectedOptions = selectedConfigurationIds.map((id) => options.find((option) => option.id === id));
  if (selectedOptions.some((option) => !option)) {
    throw new ApiError(400, 'INVALID_CONFIGURATION', 'Please select from the listed property configurations.');
  }

  const configurationValues = selectedOptions.map((option) => option.label);
  await messagesRepo.add({ sessionId, responseType: 'user', messageText: configurationValues.join(', ') });
  await sessionsRepo.updateFields(sessionId, {
    configurationIds: selectedConfigurationIds,
    configurationValues,
    state: STATES.LOCATION,
  });

  const text = 'Which preferred location or locality are you targeting?';
  await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
  return {
    session: await reload(sessionId),
    reply: { text, options: await locationOptions() },
  };
}

async function locationOptions() {
  const sectors = await serviceSectorsRepo.listActive();
  return sectors.map((sector) => ({ id: sector.id, label: sector.sector_name })).concat([{ id: null, label: 'Other' }]);
}

async function submitLocation(sessionId, { serviceSectorIds = [], locationText }) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');
  assertState(session, STATES.LOCATION, STATES.LOCATION_UNSERVICEABLE);
  assertVerified(session);

  const sectorIds = selectedIds(serviceSectorIds);
  if (!sectorIds.length && !locationText?.trim()) {
    throw new ApiError(400, 'INVALID_LOCATION', 'Please select at least one location or enter a locality.');
  }

  await sessionsRepo.updateFields(sessionId, { state: STATES.VALIDATE_LOCATION });

  const activeSectors = await serviceSectorsRepo.listActive();
  const selectedSectors = activeSectors.filter((sector) => sectorIds.includes(sector.id));
  if (selectedSectors.length !== sectorIds.length) {
    throw new ApiError(400, 'INVALID_LOCATION', 'Please select from the listed locations.');
  }

  let matchedSector = null;
  if (locationText?.trim()) {
    await messagesRepo.add({ sessionId, responseType: 'user', messageText: locationText });
    matchedSector = await serviceSectorsRepo.findByNameOrSlug(locationText.trim());
    if (!matchedSector) {
      await sessionsRepo.updateFields(sessionId, { state: STATES.LOCATION_UNSERVICEABLE, serviceSectorId: sectorIds[0] || null, serviceSectorIds: sectorIds });
      const text = `We are not providing service at this moment in your preferred area ${locationText.trim()}. Hope we will start serving soon.`;
      await messagesRepo.add({ sessionId, responseType: 'bot', messageText: text });
      return { session: await reload(sessionId), reply: { text, options: [{ id: 'retry', label: 'Try another area' }] } };
    }
  }

  if (matchedSector && !sectorIds.includes(matchedSector.id)) {
    sectorIds.push(matchedSector.id);
    selectedSectors.push(matchedSector);
  }
  const selectedLocationNames = selectedSectors.map((sector) => sector.sector_name);
  if (!locationText?.trim()) {
    await messagesRepo.add({ sessionId, responseType: 'user', messageText: selectedLocationNames.join(', ') });
  }
  await sessionsRepo.updateFields(sessionId, {
    serviceSectorId: sectorIds[0], serviceSectorIds: sectorIds, state: STATES.MATCHING_INVENTORY,
  });

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

  const categoryIds = selectedIds(session.category_ids, session.category_id);
  const subcategoryIds = selectedIds(session.subcategory_ids, session.subcategory_id);
  const configurations = selectedStrings(session.configuration_values);
  const sectorIds = selectedIds(session.service_sector_ids, session.service_sector_id);
  const categories = await Promise.all(categoryIds.map((id) => categoriesRepo.findById(id)));
  const subcategories = await Promise.all(subcategoryIds.map((id) => subcategoriesRepo.findById(id)));
  const sectors = await serviceSectorsRepo.listActive();
  const selectedSectors = sectors.filter((sector) => sectorIds.includes(sector.id));

  const result = await registry.inventory.findMatches({
    category: categories.filter(Boolean).map((category) => category.cms_slug || category.name),
    propertyCategory: subcategories.filter(Boolean).map((subcategory) => subcategory.cms_slug || subcategory.name),
    configuration: configurations,
    location: selectedSectors.map((sector) => sector.slug),
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
    reply: {
      text,
      options: [{ id: 'open', label: 'Open Results' }, { id: 'link', label: 'Get Link' }],
      resultUrl: result.resultUrl,
      properties: result.properties || [],
    },
  };
}

async function goBack(sessionId) {
  const session = await sessionsRepo.findById(sessionId);
  if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'This chat session no longer exists.');

  let previous = BACK_MAP[session.state];
  if (session.state === STATES.LOCATION) {
    const categoryIds = selectedIds(session.category_ids, session.category_id);
    previous = (await getConfigurationOptions(categoryIds)).length
      ? STATES.PROPERTY_CONFIGURATION
      : STATES.PROPERTY_SUBCATEGORY;
  }
  if (!previous) {
    const text = "You can't go back from this step.";
    return { session, reply: { text, options: null } };
  }

  await sessionsRepo.updateFields(sessionId, { state: previous });
  if (previous === STATES.PROPERTY_SUBCATEGORY) {
    await sessionsRepo.updateFields(sessionId, { configurationIds: [], configurationValues: [] });
  }
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
      const categoryIds = selectedIds(session.category_ids, session.category_id);
      const categories = await Promise.all(categoryIds.map((id) => categoriesRepo.findById(id)));
      const subcategories = (await Promise.all(categoryIds.map((id) => subcategoriesRepo.listActiveLeafOptionsByCategory(id))))
        .flat()
        .filter((subcategory, index, all) => all.findIndex((item) => item.id === subcategory.id) === index);
      const text = categoryIds.length > 1 ? 'Please select one or more property options:' : 'Please pick an option:';
      return {
        session,
        reply: {
          text,
          options: subcategories.map((subcategory) => ({
            id: subcategory.id,
            label: categoryIds.length > 1 ? `${categories.find((category) => category?.id === subcategory.root_category_id)?.name}: ${subcategory.path}` : subcategory.path,
            categoryId: subcategory.root_category_id,
          })),
        },
      };
    }
    case STATES.PROPERTY_CONFIGURATION: {
      const categoryIds = selectedIds(session.category_ids, session.category_id);
      const options = await getConfigurationOptions(categoryIds);
      return {
        session,
        reply: {
          text: 'Please select your property configuration:',
          options,
        },
      };
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
    categoryId: null, categoryIds: [], subcategoryId: null, subcategoryIds: [],
    configurationIds: [], configurationValues: [],
    serviceSectorId: null, serviceSectorIds: [], state: STATES.PROPERTY_CATEGORY,
  });
  await messagesRepo.add({ sessionId, responseType: 'user', messageText: 'Back to main menu' });
  return reenterState(sessionId, STATES.PROPERTY_CATEGORY);
}

module.exports = {
  STATES,
  SESSION_RESUME_TTL_SECONDS,
  startSession,
  resumeSession,
  submitName,
  submitMobile,
  verifyOtp,
  resendOtp,
  changeMobile,
  selectCategory,
  selectSubcategory,
  selectConfiguration,
  submitLocation,
  matchInventory,
  goBack,
  mainMenu,
};
