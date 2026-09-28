// Indian mobile number validation/normalisation.
//
// A valid Indian mobile number is 10 digits starting with 6, 7, 8 or 9.
// Common ways people type it are accepted and normalised to E.164
// (+91XXXXXXXXXX): "9876543210", "+91 98765 43210", "91-9876543210",
// "09876543210". Anything else (landlines, wrong length, other countries,
// numbers starting 0-5) is rejected.
const INDIAN_MOBILE_REGEX = /^(?:\+?91|0)?([6-9]\d{9})$/;

function normalizeMobile(raw) {
  const compact = String(raw || '').replace(/[\s\-().]/g, '');
  const match = compact.match(INDIAN_MOBILE_REGEX);
  return match ? `+91${match[1]}` : null;
}

function isValidMobile(raw) {
  return normalizeMobile(raw) !== null;
}

module.exports = { normalizeMobile, isValidMobile, INDIAN_MOBILE_REGEX };
