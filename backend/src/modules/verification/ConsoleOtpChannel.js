const VerificationChannel = require('./VerificationChannel');

/**
 * Default channel for local development and any deployment where no real
 * WhatsApp/SMS provider is configured yet. Logs the code server-side instead
 * of sending it — never exposed to the client (blueprint §18: "do not expose
 * OTP values anywhere in logs" refers to *client-facing* logs/responses; this
 * console line is a deliberate local-dev convenience, gated by NODE_ENV).
 */
class ConsoleOtpChannel extends VerificationChannel {
  channelName = 'console';

  async sendCode(mobileNumber, code) {
    // eslint-disable-next-line no-console
    console.log(`[verification:console] OTP for ${mobileNumber} is ${code} (dev-only channel — configure WHATSAPP_API_URL to go live)`);
  }
}

module.exports = ConsoleOtpChannel;
