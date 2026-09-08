// Very small E.164-ish normalizer/validator for Indian mobile numbers, with a
// generic international fallback. Good enough for Release 1; swap for a
// proper libphonenumber-based check if Disha needs international leads.
function normalizeMobile(raw) {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`; // bare 10-digit Indian number
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

function isValidMobile(raw) {
  return normalizeMobile(raw) !== null;
}

module.exports = { normalizeMobile, isValidMobile };
