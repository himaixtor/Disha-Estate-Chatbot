const VerificationChannel = require("./VerificationChannel");
const env = require("../../config/env");

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
  channelName = "whatsapp";

  async sendCode(mobileNumber, code, uname) {
    const payloadArray = {
      messaging_product: "whatsapp",
      whatsapp_no: env.whatsapp.senderId,
      to: mobileNumber,
      type: "template",
      template: {
        name: "disha_estate_v1",
        language: {
          code: "en",
        },
        components: [
          {
            type: "HEADER",
            parameters: [
              {
                type: "text",
                text: String(uname),
              },
            ],
          },
          {
            type: "BODY",
            parameters: [
              {
                type: "text",
                text: `verification code is ${code}. It expires in 5 minutes. Do not share this code with`,
              },
            ],
          },
        ],
      },
    };

    const response = await fetch(
      env.whatsapp.apiUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.whatsapp.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payloadArray),
      },
    );

    const body = await response.text();
    let result;
    try {
      result = JSON.parse(body);
    } catch (_error) {
      result = null;
    }

    console.log("WhatsApp provider response:", result ?? body);

    const messageAccepted = Array.isArray(result?.messages)
      && result.messages.length > 0;
    if (!response.ok || !messageAccepted) {
      throw new Error(
        `WhatsApp OTP provider responded ${response.status}: ${body.slice(0, 200)}`,
      );
    }
  }
}

module.exports = WhatsAppOtpChannel;
