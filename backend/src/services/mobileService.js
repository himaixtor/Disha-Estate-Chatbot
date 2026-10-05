// Mobile number validation/normalisation for the supported regions.
//
// The widget sends numbers in E.164 form ("+<country code><number>"). Each
// supported country has a mobile-number pattern for the national part (after
// any leading trunk "0" is dropped). A bare number with no "+" is treated as
// Indian, so "9876543210" keeps working.
//
// To support another country, add one entry here AND the matching entry in
// the widget's COUNTRIES list (chatbot/src/widget.js).
const COUNTRIES = [
  { dial: '91', name: 'India', pattern: /^[6-9]\d{9}$/ },                     // 98765 43210
  { dial: '1', name: 'USA / Canada', pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },      // 415 555 2671
  { dial: '44', name: 'United Kingdom', pattern: /^7\d{9}$/ },                  // 7911 123456
  { dial: '61', name: 'Australia', pattern: /^4\d{8}$/ },                       // 412 345 678
  { dial: '971', name: 'UAE', pattern: /^5[024568]\d{7}$/ },                    // 50 123 4567
  { dial: '974', name: 'Qatar', pattern: /^[3567]\d{7}$/ },                     // 3312 3456
];

// Longest dial codes first so "+971…" is never read as "+97…"/"+9…".
const BY_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

function normalizeMobile(raw) {
  let compact = String(raw || '').replace(/[\s\-().]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`; // 00971… international prefix

  if (compact.startsWith('+')) {
    const digits = compact.slice(1);
    if (!/^\d+$/.test(digits)) return null;
    const country = BY_LENGTH.find((c) => digits.startsWith(c.dial));
    if (!country) return null;
    const national = digits.slice(country.dial.length).replace(/^0/, '');
    return country.pattern.test(national) ? `+${country.dial}${national}` : null;
  }

  // No "+": Indian number, optionally written as 91XXXXXXXXXX or 0XXXXXXXXXX.
  const match = compact.match(/^(?:91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

function isValidMobile(raw) {
  return normalizeMobile(raw) !== null;
}

module.exports = { normalizeMobile, isValidMobile, COUNTRIES };
