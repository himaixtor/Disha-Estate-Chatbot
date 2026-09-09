/**
 * VerificationChannel — the interface every mobile-verification implementation
 * must satisfy. Nothing outside this folder should ever import a concrete
 * implementation directly; go through modules/registry.js.
 *
 * @interface
 *   sendCode(mobileNumber: string, code: string): Promise<void>
 *   channelName: string
 */
class VerificationChannel {
  async sendCode(_mobileNumber, _code, _uname) {
    throw new Error('VerificationChannel.sendCode must be implemented by a concrete channel.');
  }
}

module.exports = VerificationChannel;
