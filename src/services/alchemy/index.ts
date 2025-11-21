/**
 * Alchemy Services Index
 * 
 * Central export point for all Alchemy SDK integrations.
 * These services provide enhanced blockchain data access, real-time monitoring,
 * and transaction analysis capabilities.
 */

import { getAlchemyClient as getClient } from './AlchemyClient';
import { AlchemyTokenService as TokenService } from './AlchemyTokenService';
import { AlchemyPricesService as PricesService } from './AlchemyPricesService';
import { AlchemyTraceService as TraceService } from './AlchemyTraceService';
import { AlchemyWebhookService as WebhookService } from './AlchemyWebhookService';

export { 
  AlchemyClient, 
  getAlchemyClient, 
  resetAlchemyClient,
  type AlchemyConfig 
} from './AlchemyClient';

export { 
  AlchemyTokenService,
  type TokenBalance, 
  type TokenMetadata, 
  type TransferFilter 
} from './AlchemyTokenService';

export { 
  AlchemyPricesService,
  type TokenPrice, 
  type PriceComparison 
} from './AlchemyPricesService';

export { 
  AlchemyTraceService,
  type TraceResult, 
  type TransactionAnalysis 
} from './AlchemyTraceService';

export { 
  AlchemyWebhookService,
  type WebhookEvent, 
  type AddressActivityConfig 
} from './AlchemyWebhookService';

/**
 * Create a complete Alchemy service suite
 */
export function createAlchemyServices() {
  return {
    client: getClient(),
    tokens: new TokenService(),
    prices: new PricesService(),
    trace: new TraceService(),
    webhooks: new WebhookService(),
  };
}
