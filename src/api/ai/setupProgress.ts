import type { PricingSchema, SetupStep } from './types';
import { normalizePricingSchema } from './llm';

/**
 * Setup phases that {@link orchestrateSetup} will report for this schema (excludes `done` / `parsing`).
 * Must stay in sync with orchestrator branching.
 */
export function getSetupProgressSteps(schema: PricingSchema): SetupStep[] {
	const normalized = normalizePricingSchema(schema);
	const steps: SetupStep[] = ['creating_features', 'creating_plans', 'creating_prices'];

	if (normalized.plans.some((p) => p.entitlements.length > 0)) {
		steps.push('creating_entitlements');
	}

	if ((normalized.credit_grants ?? []).length > 0) {
		steps.push('creating_credit_grants');
	}

	return steps;
}
