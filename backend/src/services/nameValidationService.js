// Heuristic name validation (blueprint §17). Deliberately simple and
// deterministic — no AI call for this in Release 1. Rejects the obvious junk
// categories the brief calls out; anything borderline is let through rather
// than frustrating a real visitor with an unusual (but real) name.
const URL_PATTERN = /https?:\/\/|www\.|\.[a-z]{2,}\//i;
const QUESTIONISH = /[?]$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50; // widget input uses the same limit
const PROMPT_INJECTION_HINTS = /ignore (all|previous) instructions|system prompt|you are an ai|act as/i;

function isValidName(raw) {
  const value = (raw || '').trim();

  if (value.length < NAME_MIN_LENGTH || value.length > NAME_MAX_LENGTH) return false;
  if (/^\d+$/.test(value)) return false; // numbers only
  if (URL_PATTERN.test(value)) return false;
  if (QUESTIONISH.test(value)) return false;
  if (PROMPT_INJECTION_HINTS.test(value)) return false;
  if (value.split(/\s+/).length > 6) return false; // "random sentences" heuristic
  if (!/^[a-zA-Z][a-zA-Z\s.'-]*$/.test(value)) return false; // letters + common name punctuation only

  return true;
}

module.exports = { isValidName, NAME_MIN_LENGTH, NAME_MAX_LENGTH };
