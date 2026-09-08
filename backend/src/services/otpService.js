const crypto = require('crypto');
const otpRepo = require('../db/repositories/otpRepo');
const { registry } = require('../modules/registry');
const { ApiError } = require('../utils/apiResponse');

const OTP_EXPIRY_SECONDS = 300; // 5 min — blueprint §E recommended default
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 4;

function generateCode() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendOtp({ sessionId, mobileNumber }) {
  const code = generateCode();
  const otpHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  await otpRepo.create({ sessionId, mobileNumber, otpHash, expiresAt, maxAttempts: OTP_MAX_ATTEMPTS });
  console.log(`Generated OTP for session ${sessionId}: ${code} (expires at ${expiresAt.toISOString()})`);
  console.log(`Sent OTP for session ${sessionId} to ${mobileNumber}`);
  await registry.verification.sendCode(mobileNumber, code);
  

  // The code itself never returns from this function to a caller that might
  // put it in an HTTP response — see chat.controller's chatOtpSend handler.
}

async function verifyOtp({ sessionId, code }) {
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

module.exports = { sendOtp, verifyOtp, OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS };
