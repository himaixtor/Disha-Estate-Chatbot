/**
 * InventoryProvider — the interface for matching a lead's preferences against
 * Disha's (or any future client's) property inventory.
 *
 * @interface
 *   findMatches({ category, propertyCategory, configuration, location, sessionId }): Promise<{
 *     matched: boolean, resultUrl?: string, properties?: Array<object>
 *   }>
 */
class InventoryProvider {
  async findMatches(_criteria) {
    throw new Error('InventoryProvider.findMatches must be implemented by a concrete provider.');
  }
}

module.exports = InventoryProvider;
