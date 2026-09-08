/**
 * AIProvider — the interface Release 2's real AI Middleware client will
 * implement (blueprint §F). Present now purely so the Backend's /ai routes
 * and the widget's AI Q&A hook are wired against a stable shape.
 *
 * @interface
 *   ask({ sessionId, message }): Promise<{ answer: string }>
 */
class AIProvider {
  async ask(_params) {
    throw new Error('AIProvider.ask must be implemented by a concrete provider.');
  }
}

module.exports = AIProvider;
