import type { PricingEntitlement } from './types';

/**
 * Only capped / static-limit entitlements are persisted. Unlimited metered rows are omitted;
 * usage is enforced via usage prices and (for credit pools) credit_grants.
 */
export function shouldPersistEntitlement(ent: PricingEntitlement, featureType: 'static' | 'metered'): boolean {
	if (ent.is_unlimited) return false;
	if (featureType === 'metered') return ent.value != null;
	return true;
}
