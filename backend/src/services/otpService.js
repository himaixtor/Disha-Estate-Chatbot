const crypto = require('crypto');
const otpRepo = require('../db/repositories/otpRepo');
const { registry } = require('../modules/registry');
const { ApiError } = require('../utils/apiResponse');

const OTP_EXPIRY_SECONDS = 300; // 5 min — blueprint §E recommended default
const OTP_MAX_ATTEMPTS = 5;
// The code is always exactly this many digits (min = max). The widget input,
// the request validator and the "we sent a N-digit code" text all read it
// from here, so changing it is a one-line change.
const OTP_LENGTH = 4;
const OTP_RESEND_COOLDOWN_SECONDS = 30; // minimum gap between two codes for one session
const OTP_MAX_SENDS_PER_SESSION = 5;    // resends + number changes combined

function generateCode() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Throws OTP_RESEND_TOO_SOON / OTP_SEND_LIMIT when another code isn't
// allowed yet — checked before anything is generated or sent.
async function assertCanSend(sessionId, { enforceCooldown }) {
  const { sentCount, secondsSinceLast } = await otpRepo.sendStats(sessionId);
  if (sentCount >= OTP_MAX_SENDS_PER_SESSION) {
    throw new ApiError(429, 'OTP_SEND_LIMIT', 'Too many verification codes have been requested for this chat. Please try again after some time.');
  }
  if (enforceCooldown && secondsSinceLast != null && secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
    const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast;
    throw new ApiError(429, 'OTP_RESEND_TOO_SOON', `Please wait ${wait} second(s) before requesting a new code.`, [{ field: 'retryAfter', message: String(wait) }]);
  }
}

// enforceCooldown: true for "Resend OTP" (same number). A changed number
// skips the cooldown but still counts toward OTP_MAX_SENDS_PER_SESSION.
async function sendOtp({ sessionId, mobileNumber, name, enforceCooldown = false }) {
  await assertCanSend(sessionId, { enforceCooldown });
  const code = generateCode();
  const otpHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  await otpRepo.create({ sessionId, mobileNumber, otpHash, expiresAt, maxAttempts: OTP_MAX_ATTEMPTS });
  console.log(`Generated OTP for session ${sessionId}: ${code} (expires at ${expiresAt.toISOString()})`);
  console.log(`Sent OTP for session ${sessionId} to ${mobileNumber} ${name}`);
  await registry.verification.sendCode(mobileNumber, code, name);
  

  // The code itself never returns from this function to a caller that might
  // put it in an HTTP response — see chat.controller's chatOtpSend handler.
}

async function verifyOtp({ sessionId, code }) {
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(String(code || ''))) {
    throw new ApiError(400, 'OTP_FORMAT', `Please enter the ${OTP_LENGTH}-digit code (numbers only).`);
  }
  const record = await otpRepo.findLatestForSession(sessionId);
  if (!record) {
    throw new ApiError(400, 'OTP_NOT_FOUND', 'No verification code was requested for this session.');
  }
  if (record.verified_at) {
    return { verified: true, alreadyVerified: true };
  }
  if (new Date(record.expires_at) < new Date()) {
    throw new ApiError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new one.');
  }
  if (record.attempt_count >= record.max_attempts) {
    throw new ApiError(429, 'OTP_ATTEMPTS_EXHAUSTED', 'Too many incorrect attempts. Please request a new code.');
  }

  const isMatch = hashCode(code) === record.otp_hash;
  if (!isMatch) {
    await otpRepo.incrementAttempt(record.id);
    const attemptsLeft = record.max_attempts - (record.attempt_count + 1);
    if (attemptsLeft <= 0) {
      throw new ApiError(429, 'OTP_ATTEMPTS_EXHAUSTED', 'Too many incorrect attempts. Please request a new code.');
    }
    throw new ApiError(400, 'OTP_INCORRECT', `Incorrect code. ${attemptsLeft} attempt(s) remaining.`);
  }

  await otpRepo.markVerified(record.id);
  return { verified: true, alreadyVerified: false };
}

module.exports = {
  sendOtp, verifyOtp, OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS, OTP_LENGTH,
  OTP_RESEND_COOLDOWN_SECONDS, OTP_MAX_SENDS_PER_SESSION,
};
