import { PlanType } from '@/constants/planTypes';
import type { PricingCardProps } from '@/components/molecules/PricingCard/PricingCard';
import { normalizePricingSchema } from './llm';
import type { PricingCreditGrant, PricingSchema, PricingPlan } from './types';

// ============================================
// Display type inference
// ============================================

function getPlanDisplayType(plan: PricingPlan): PlanType {
	const flatAmount = plan.prices[0]?.amount ?? 0;
	const hasUsage = (plan.usage_charges ?? []).length > 0;

	if (flatAmount > 0 && hasUsage) return PlanType.HYBRID_PAID;
	if (flatAmount === 0 && hasUsage) return PlanType.HYBRID_FREE;
	if (plan.prices.length === 0 && hasUsage) return PlanType.USAGE_ONLY;
	if (flatAmount === 0) return PlanType.FREE;
	return PlanType.FIXED;
}

// ============================================
// Schema → PricingCardProps[]
// No API calls — pure data transformation for the preview step.
// ============================================

export function schemaToPricingCardProps(schema: PricingSchema): PricingCardProps[] {
	const normalized = normalizePricingSchema(schema);
	const featureMap = new Map(normalized.features.map((f) => [f.key, f]));

	const grantsByPlan = new Map<string, PricingCreditGrant[]>();
	for (const g of normalized.credit_grants ?? []) {
		const list = grantsByPlan.get(g.plan_name) ?? [];
		list.push(g);
		grantsByPlan.set(g.plan_name, list);
	}

	return normalized.plans.map((plan, index) => {
		const displayType = getPlanDisplayType(plan);
		const firstPrice = plan.prices[0];

		const creditGrantsForPlan = (grantsByPlan.get(plan.name) ?? []).map((g) => ({
			name: g.name,
			credits: g.credits,
			cadence: g.cadence,
			period: g.period ?? null,
		}));

		const usageCharges = (plan.usage_charges ?? []).map((charge) => ({
			amount: String(charge.amount_per_unit),
			currency: charge.currency,
			billing_model: (charge.billing_model ?? 'flat_fee').toUpperCase(),
			meter_name: charge.display_name ?? featureMap.get(charge.feature_key)?.name ?? charge.feature_key,
			tiers: null as null,
		}));

		const planBillingPeriod = firstPrice?.billing_period ?? 'monthly';

		const entitlements = plan.entitlements.map((ent, entIndex) => {
			const feature = featureMap.get(ent.feature_key);
			const isMetered = feature?.type === 'metered';
			return {
				id: `preview-ent-${index}-${entIndex}`,
				feature_id: '',
				name: feature?.name ?? ent.feature_key,
				type: (isMetered ? 'METERED' : 'STATIC') as 'STATIC' | 'METERED',
				value: ent.is_unlimited ? 'Unlimited' : String(ent.value ?? ''),
				usage_reset_period: planBillingPeriod,
			};
		});

		return {
			id: `preview-${index}`,
			name: plan.name,
			description: plan.description,
			price: {
				amount: firstPrice ? String(firstPrice.amount) : '0',
				currency: firstPrice?.currency ?? 'USD',
				billingPeriod: planBillingPeriod,
				displayType,
			},
			usageCharges,
			entitlements,
			creditGrants: creditGrantsForPlan,
			showUsageCharges: usageCharges.length > 0,
			isPreview: true,
		};
	});
}
