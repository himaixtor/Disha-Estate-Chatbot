const AIProvider = require('./AIProvider');

/**
 * Active whenever the "ai" module is not in ENABLED_MODULES (the Release 1
 * default). Returns a fixed, honest response instead of calling any LLM.
 */
class StubAIProvider extends AIProvider {
  async ask(_params) {
    return {
      answer: "AI-powered scheme Q&A isn't available yet — it's part of a later release. A member of our team can help with specific questions in the meantime.",
    };
  }
}

module.exports = StubAIProvider;
