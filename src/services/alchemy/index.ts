/**
 * Alchemy Services Index
 * 
 * Central export point for all Alchemy SDK integrations.
 * These services provide enhanced blockchain data access, real-time monitoring,
 * and transaction analysis capabilities.
 */

export { AlchemyClient, getAlchemyClient, resetAlchemyClient } from './AlchemyClient';
export type { AlchemyConfig } from './AlchemyClient';

export { AlchemyTokenService } from './AlchemyTokenService';
export type { TokenBalance, TokenMetadata, TransferFilter } from './AlchemyTokenService';

export { AlchemyPricesService } from './AlchemyPricesService';
export type { TokenPrice, PriceComparison } from './AlchemyPricesService';

export { AlchemyTraceService } from './AlchemyTraceService';
export type { TraceResult, TransactionAnalysis } from './AlchemyTraceService';

export { AlchemyWebhookService } from './AlchemyWebhookService';
export type { WebhookEvent, AddressActivityConfig } from './AlchemyWebhookService';

/**
 * Create a complete Alchemy service suite
 */
export function createAlchemyServices() {
  return {
    client: getAlchemyClient(),
    tokens: new AlchemyTokenService(),
    prices: new AlchemyPricesService(),
    trace: new AlchemyTraceService(),
    webhooks: new AlchemyWebhookService(),
  };
}
