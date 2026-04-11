import { describe, expect, test } from 'vitest';
import { SUBSCRIPTION_MODIFY_TYPE } from '@/models';
import { buildQuantityChangeModifyRequest } from '@/utils/subscription/buildQuantityChangeModifyRequest';

describe('buildQuantityChangeModifyRequest', () => {
	test('builds quantity_change payload with line item id and quantity string', () => {
		const req = buildQuantityChangeModifyRequest({
			lineItemId: 'li_123',
			quantity: '12.5',
		});
		expect(req.type).toBe(SUBSCRIPTION_MODIFY_TYPE.QUANTITY_CHANGE);
		expect(req.quantity_change_params?.line_items).toHaveLength(1);
		expect(req.quantity_change_params?.line_items[0]).toEqual({
			id: 'li_123',
			quantity: '12.5',
		});
		expect(req.inheritance_params).toBeUndefined();
	});

	test('includes effective_date when provided', () => {
		const iso = '2026-04-15T12:00:00.000Z';
		const req = buildQuantityChangeModifyRequest({
			lineItemId: 'li_abc',
			quantity: '1',
			effectiveDateIso: iso,
		});
		expect(req.quantity_change_params?.line_items[0]).toEqual({
			id: 'li_abc',
			quantity: '1',
			effective_date: iso,
		});
	});
});
