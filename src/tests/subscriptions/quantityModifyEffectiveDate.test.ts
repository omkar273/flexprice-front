import { describe, expect, test } from 'vitest';
import { INVOICE_CADENCE } from '@/models/Invoice';
import type { LineItem } from '@/models/Subscription';
import {
	buildEffectiveDateIsoForQuantityModify,
	clampEffectiveDateToLineItemActiveWindow,
	getDefaultEffectiveDateForQuantityModify,
	getInvoiceCadenceFromLineItem,
	isEffectiveDateWithinBillingPeriod,
	isEffectiveDateWithinLineItemWindow,
	lastInstantInsideBillingPeriodEnd,
	resolveEffectiveDateIsoForLineItemModify,
} from '@/utils/subscription/quantityModifyEffectiveDate';

const periodStart = '2026-04-01T00:00:00.000Z';
const periodEnd = '2026-05-01T00:00:00.000Z';

function minimalLineItem(overrides: Partial<LineItem> & { price?: { invoice_cadence: string } }): LineItem {
	return {
		id: 'li_1',
		subscription_id: 'sub_1',
		customer_id: 'cus_1',
		price_id: 'pr_1',
		meter_id: 'm_1',
		environment_id: 'env',
		tenant_id: 'ten',
		display_name: 'Test',
		plan_display_name: 'P',
		meter_display_name: 'M',
		price_type: 'FIXED',
		billing_period: 'MONTHLY',
		currency: 'USD',
		quantity: 1,
		start_date: '',
		end_date: '',
		metadata: {},
		created_at: '',
		updated_at: '',
		status: 'published',
		...overrides,
	} as LineItem;
}

describe('quantityModifyEffectiveDate', () => {
	test('arrear uses period start', () => {
		const li = minimalLineItem({
			price: { invoice_cadence: INVOICE_CADENCE.ARREAR } as LineItem['price'],
		});
		expect(getInvoiceCadenceFromLineItem(li)).toBe(INVOICE_CADENCE.ARREAR);
		const d = getDefaultEffectiveDateForQuantityModify(li, periodStart, periodEnd);
		expect(d?.toISOString()).toBe(periodStart);
	});

	test('advance uses last instant inside period (end exclusive)', () => {
		const li = minimalLineItem({
			price: { invoice_cadence: INVOICE_CADENCE.ADVANCE } as LineItem['price'],
		});
		expect(getInvoiceCadenceFromLineItem(li)).toBe(INVOICE_CADENCE.ADVANCE);
		const d = getDefaultEffectiveDateForQuantityModify(li, periodStart, periodEnd);
		expect(d?.toISOString()).toBe(lastInstantInsideBillingPeriodEnd(periodEnd)?.toISOString());
	});

	test('unknown cadence leaves default undefined', () => {
		const li = minimalLineItem({ price: undefined });
		expect(getDefaultEffectiveDateForQuantityModify(li, periodStart, periodEnd)).toBeUndefined();
	});

	test('arrear clamps to line item start when period start is earlier', () => {
		const lineStart = '2026-04-10T13:11:04.831Z';
		const li = minimalLineItem({
			start_date: lineStart,
			price: { invoice_cadence: INVOICE_CADENCE.ARREAR } as LineItem['price'],
		});
		const d = getDefaultEffectiveDateForQuantityModify(li, periodStart, periodEnd);
		expect(d?.toISOString()).toBe(new Date(lineStart).toISOString());
	});

	test('clampEffectiveDate raises candidate to line start', () => {
		const li = minimalLineItem({
			start_date: '2026-04-10T00:00:00.000Z',
		});
		const out = clampEffectiveDateToLineItemActiveWindow(new Date('2026-03-31T18:30:00.000Z'), li);
		expect(out.toISOString()).toBe('2026-04-10T00:00:00.000Z');
	});

	test('isEffectiveDateWithinLineItemWindow rejects before start', () => {
		const li = minimalLineItem({ start_date: '2026-04-10T00:00:00.000Z' });
		expect(isEffectiveDateWithinLineItemWindow(li, new Date('2026-03-31T00:00:00.000Z'))).toBe(false);
		expect(isEffectiveDateWithinLineItemWindow(li, new Date('2026-04-10T00:00:00.000Z'))).toBe(true);
	});

	test('resolveEffectiveDateIso preserves server start string when JS time matches start (sub-ms safe)', () => {
		const startRaw = '2026-04-10T13:11:04.831973Z';
		const li = minimalLineItem({ start_date: startRaw });
		const clamped = clampEffectiveDateToLineItemActiveWindow(new Date('2026-03-31T00:00:00.000Z'), li);
		expect(resolveEffectiveDateIsoForLineItemModify(li, clamped)).toBe(startRaw);
	});

	test('resolveEffectiveDateIso uses toISOString when clearly after line start', () => {
		const li = minimalLineItem({ start_date: '2026-04-10T00:00:00.000Z' });
		const later = new Date('2026-04-15T12:00:00.000Z');
		expect(resolveEffectiveDateIsoForLineItemModify(li, later)).toBe(later.toISOString());
	});

	test('isEffectiveDateWithinBillingPeriod uses exclusive end', () => {
		const end = '2026-04-30T18:30:00.000Z';
		expect(isEffectiveDateWithinBillingPeriod(periodStart, end, new Date(end))).toBe(false);
		expect(isEffectiveDateWithinBillingPeriod(periodStart, end, new Date(new Date(end).getTime() - 1))).toBe(true);
	});

	test('buildEffectiveDateIso nudges off exclusive period end', () => {
		const li = minimalLineItem({ start_date: '2026-04-01T00:00:00.000Z' });
		const periodEnd = '2026-04-30T18:30:00.000Z';
		const onEnd = new Date(periodEnd);
		const iso = buildEffectiveDateIsoForQuantityModify(li, onEnd, periodEnd);
		expect(iso).toBe(new Date(new Date(periodEnd).getTime() - 1).toISOString());
	});
});
