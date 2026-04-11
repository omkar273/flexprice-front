import type { LineItem } from '@/models/Subscription';
import type { Price } from '@/models/Price';
import {
	BILLING_MODEL,
	TIER_MODE,
	PRICE_ENTITY_TYPE,
	PRICE_TYPE,
	PRICE_UNIT_TYPE,
	BILLING_PERIOD,
	BILLING_CADENCE,
	ENTITY_STATUS,
} from '@/models';

const BILLING_PERIOD_VALUES = new Set<string>(Object.values(BILLING_PERIOD));
const PRICE_TYPE_VALUES = new Set<string>(Object.values(PRICE_TYPE));

function toBillingPeriod(value: string | undefined): BILLING_PERIOD {
	const upper = value?.toUpperCase();
	return upper && BILLING_PERIOD_VALUES.has(upper) ? (upper as BILLING_PERIOD) : BILLING_PERIOD.MONTHLY;
}

function toPriceType(value: string | undefined): PRICE_TYPE {
	const upper = value?.toUpperCase();
	return upper && PRICE_TYPE_VALUES.has(upper) ? (upper as PRICE_TYPE) : PRICE_TYPE.USAGE;
}

/** Normalized `price_type` for branching (e.g. FIXED vs USAGE). */
export function getPriceTypeFromLineItem(lineItem: Pick<LineItem, 'price_type'>): PRICE_TYPE {
	return toPriceType(lineItem.price_type);
}

/**
 * Converts a subscription LineItem to a Price object for use in PriceOverrideDialog
 * when the line item does not have an embedded price.
 */
export function lineItemToPrice(lineItem: LineItem): Price {
	if (lineItem.price) {
		return lineItem.price;
	}

	const entityType =
		lineItem.entity_type != null
			? (lineItem.entity_type.toUpperCase() as PRICE_ENTITY_TYPE)
			: lineItem.plan_id
				? PRICE_ENTITY_TYPE.PLAN
				: PRICE_ENTITY_TYPE.SUBSCRIPTION;
	const entityId = lineItem.entity_id ?? lineItem.plan_id ?? lineItem.subscription_id;
	const billingPeriod = toBillingPeriod(lineItem.billing_period);
	const priceType = toPriceType(lineItem.price_type);

	return {
		id: lineItem.price_id,
		amount: lineItem.quantity?.toString() || '0',
		currency: lineItem.currency,
		billing_model: lineItem.price_type as BILLING_MODEL,
		tier_mode: TIER_MODE.VOLUME,
		tiers: [],
		transform_quantity: { divide_by: 1 },
		description: lineItem.display_name,
		meter: { name: lineItem.meter_display_name },
		type: priceType,
		display_amount: lineItem.quantity?.toString() || '0',
		entity_type: entityType,
		entity_id: entityId,
		price_unit_type: PRICE_UNIT_TYPE.FIAT,
		created_at: lineItem.created_at,
		updated_at: lineItem.updated_at,
		status: ENTITY_STATUS.PUBLISHED,
		environment_id: lineItem.environment_id,
		tenant_id: lineItem.tenant_id,
		meter_id: lineItem.meter_id,
		metadata: lineItem.metadata,
		billing_period: billingPeriod,
		billing_period_count: 1,
		billing_cadence: BILLING_CADENCE.RECURRING,
		filter_values: {},
		unit_amount: lineItem.quantity?.toString() || '0',
		flat_amount: '0',
		up_to: null,
	} as unknown as Price;
}
