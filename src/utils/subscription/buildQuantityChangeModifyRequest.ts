import { SUBSCRIPTION_MODIFY_TYPE } from '@/models';
import type { ExecuteSubscriptionModifyRequest } from '@/types/dto/Subscription';

export interface BuildQuantityChangeModifyRequestParams {
	lineItemId: string;
	/** Decimal quantity as string (API JSON). */
	quantity: string;
	/** ISO 8601; omit for effective immediately. */
	effectiveDateIso?: string;
}

export function buildQuantityChangeModifyRequest({
	lineItemId,
	quantity,
	effectiveDateIso,
}: BuildQuantityChangeModifyRequestParams): ExecuteSubscriptionModifyRequest {
	const lineItem: { id: string; quantity: string; effective_date?: string } = {
		id: lineItemId,
		quantity,
	};
	if (effectiveDateIso) {
		lineItem.effective_date = effectiveDateIso;
	}
	return {
		type: SUBSCRIPTION_MODIFY_TYPE.QUANTITY_CHANGE,
		quantity_change_params: {
			line_items: [lineItem],
		},
	};
}
