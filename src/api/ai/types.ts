// ============================================
// Pricing Setup — shared TypeScript interfaces
// ============================================

export interface PricingFeature {
	name: string;
	key: string;
	type: 'static' | 'metered';
	unit_singular: string;
	unit_plural: string;
	/**
	 * Ingestion event name (Flexprice events API). Can differ from key, e.g. "emails.sent" vs emails_sent.
	 * Omit to default to key.
	 */
	meter_event_name?: string | null;
	/** COUNT = one event = one unit; SUM = sum a numeric property (e.g. messages, minutes). */
	aggregation?: 'count' | 'sum' | null;
	/** Required for SUM — property on the event payload (e.g. "minutes", "messages", "emails"). */
	aggregation_field?: string | null;
}

export interface PricingEntitlement {
	feature_key: string;
	is_unlimited: boolean;
	/** null when is_unlimited is true */
	value: number | null;
}

export interface PricingPrice {
	/** Amount in main currency units (dollars for USD). $20/month → 20. 0 for free plans. */
	amount: number;
	currency: string;
	billing_period: 'monthly' | 'annual' | 'one_time';
}

export interface PricingUsageChargeFilter {
	key: string;
	values: string[];
}

export interface PricingUsageCharge {
	/** Must match a metered feature key */
	feature_key: string;
	/**
	 * Price per unit in dollars (flat_fee) or price per package in dollars (package).
	 * Apollo credits: amount_per_unit = credit cost of the action (1, 5, 10 …).
	 * Vapi minutes: 0.05. Gemini per-1M tokens: 2.00.
	 */
	amount_per_unit: number;
	currency: string;
	billing_period: 'monthly' | 'annual';
	/**
	 * 'flat_fee' (default) — charge per single unit.
	 * 'package'            — charge per package_size units (e.g. per 1 M tokens).
	 */
	billing_model?: 'flat_fee' | 'package' | null;
	/**
	 * Required for package billing. Number of units per package.
	 * $2.00 per 1 M tokens → package_size: 1000000, amount_per_unit: 2.00.
	 */
	package_size?: number | null;
	/**
	 * Gemini-style model/variant routing.
	 * e.g. [{ key: "model", values: ["gemini-3.1-pro"] }, { key: "batch", values: ["false"] }]
	 */
	filter_values?: PricingUsageChargeFilter[] | null;
	/** Human-readable label shown on invoices (optional). */
	display_name?: string | null;
}

export interface PricingPlan {
	name: string;
	description: string;
	prices: PricingPrice[];
	entitlements: PricingEntitlement[];
	usage_charges?: PricingUsageCharge[];
}

export interface PricingCreditGrant {
	plan_name: string;
	name: string;
	credits: number;
	cadence: 'onetime' | 'recurring';
	period?: 'monthly' | 'annual' | null;
	conversion_rate?: number | null;
}

export interface PricingSchema {
	features: PricingFeature[];
	plans: PricingPlan[];
	credit_grants?: PricingCreditGrant[];
}

export type SetupStep =
	| 'parsing'
	| 'creating_features'
	| 'creating_plans'
	| 'creating_prices'
	| 'creating_entitlements'
	| 'creating_credit_grants'
	| 'done';

export type ProgressCallback = (step: SetupStep) => void;
