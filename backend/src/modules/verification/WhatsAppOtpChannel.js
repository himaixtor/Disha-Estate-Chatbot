const VerificationChannel = require('./VerificationChannel');
const env = require('../../config/env');

/**
 * Real WhatsApp OTP delivery, against the provider contract Disha shared
 * (a self-hosted WhatsApp send-message API, not the raw Meta Cloud API):
 *
 *   POST {WHATSAPP_API_URL}
 *   {WHATSAPP_AUTH_HEADER}: {WHATSAPP_AUTH_PREFIX}{WHATSAPP_API_TOKEN}
 *   { "messaging_product": "whatsapp", "whatsapp_no": "<business number>",
 *     "to": "+91XXXXXXXXXX", "type": "text", "text": { "body": "..." } }
 *
 * Once Disha shares the actual provider contract, this is the ONLY file that
 * should need to change — everything upstream only knows the
 * VerificationChannel interface.
 *
 * NOTE: the sample Disha shared didn't include an auth example, only a token
 * value. First attempt was `Authorization: Bearer <token>`, which the
 * provider rejected with 401 "Invalid token or user not found" — that could
 * mean a wrong header/prefix, an invalid token, or a whatsapp_no not tied to
 * that token. WHATSAPP_AUTH_HEADER / WHATSAPP_AUTH_PREFIX (config/env.js) let
 * you try variations from .env alone — see .env.example for what to try.
 */
class WhatsAppOtpChannel extends VerificationChannel {
  channelName = 'whatsapp';

  async sendCode(mobileNumber, code) {
    const payload = {
  messaging_product: "whatsapp",
  whatsapp_no: env.whatsapp.senderId, // e.g., "919999999999"
  to: mobileNumber,              // e.g., "+919999999999"
  type: "text",
  text: {
    body: `Your Disha Estate Management verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`
  }
};
    const response = await fetch(env.whatsapp.apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.whatsapp.apiToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
    // const res = await fetch(env.whatsapp.apiUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     [env.whatsapp.authHeader]: ` ${env.whatsapp.apiToken}`,
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     whatsapp_no: env.whatsapp.senderId,
    //     to: mobileNumber, // already E.164 (+91...) by the time it reaches here — see mobileService.normalizeMobile
    //     type: 'text',
    //     text: {
    //       body: `Your Disha Estate Management verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`,
    //     },
    //   }),
    // });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`WhatsApp OTP provider responded ${response.status}: ${body.slice(0, 200)}`);
    }
  }
}

module.exports = WhatsAppOtpChannel;
