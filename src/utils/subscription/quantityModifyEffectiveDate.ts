import { INVOICE_CADENCE } from '@/models/Invoice';
import type { LineItem } from '@/models/Subscription';

const DEFAULT_END_SENTINEL = '0001-01-01T00:00:00Z';

function parseLineItemStartDate(lineItem: LineItem): Date | null {
	const s = lineItem.start_date?.trim();
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

function parseLineItemEndDate(lineItem: LineItem): Date | null {
	const e = lineItem.end_date?.trim();
	if (!e || e === DEFAULT_END_SENTINEL) return null;
	const d = new Date(e);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Ensures the effective instant is within [line_item.start, line_item.end] when those are known.
 * Subscription period start can be before a mid-period charge’s start; backend rejects that.
 */
export function clampEffectiveDateToLineItemActiveWindow(candidate: Date, lineItem: LineItem): Date {
	let t = candidate.getTime();
	const start = parseLineItemStartDate(lineItem);
	if (start && t < start.getTime()) {
		t = start.getTime();
	}
	const end = parseLineItemEndDate(lineItem);
	if (end && t > end.getTime()) {
		t = end.getTime();
	}
	return new Date(t);
}

/** True if `date` falls in the line item’s active window (when bounds exist). */
export function isEffectiveDateWithinLineItemWindow(lineItem: LineItem, date: Date): boolean {
	const start = parseLineItemStartDate(lineItem);
	if (start && date.getTime() < start.getTime()) return false;
	const end = parseLineItemEndDate(lineItem);
	if (end && date.getTime() > end.getTime()) return false;
	return true;
}

/**
 * ISO string for `effective_date` on the modify API.
 * When the chosen instant aligns with `line_item.start_date` in JS (ms precision), `toISOString()` can truncate
 * sub-millisecond values and send a timestamp **before** the server’s true `line_item_start`. In that case return
 * the original `start_date` string from the API unchanged.
 */
export function resolveEffectiveDateIsoForLineItemModify(lineItem: LineItem, effectiveDate: Date): string {
	const startRaw = lineItem.start_date?.trim();
	if (!startRaw) {
		return effectiveDate.toISOString();
	}
	const startMs = new Date(startRaw).getTime();
	const effMs = effectiveDate.getTime();
	if (Number.isNaN(startMs) || Number.isNaN(effMs)) {
		return effectiveDate.toISOString();
	}
	if (effMs <= startMs) {
		return startRaw;
	}
	return effectiveDate.toISOString();
}

/** Backend treats the current billing period as [start, end) — `current_period_end` is exclusive. */
export function isEffectiveDateWithinBillingPeriod(periodStartIso: string, periodEndIso: string, date: Date): boolean {
	const s = new Date(periodStartIso).getTime();
	const e = new Date(periodEndIso).getTime();
	const t = date.getTime();
	if ([s, e, t].some(Number.isNaN)) return true;
	return t >= s && t < e;
}

/** Last representable instant still inside [start, end) in ms (end exclusive). */
export function lastInstantInsideBillingPeriodEnd(periodEndIso: string): Date | undefined {
	const end = new Date(periodEndIso);
	if (Number.isNaN(end.getTime())) return undefined;
	return new Date(end.getTime() - 1);
}

/**
 * Final `effective_date` ISO for the modify API: line-start preservation, then nudge off exclusive period end.
 */
export function buildEffectiveDateIsoForQuantityModify(
	lineItem: LineItem,
	effectiveDate: Date,
	currentPeriodEndIso: string | undefined,
): string {
	const endMs = currentPeriodEndIso ? new Date(currentPeriodEndIso).getTime() : NaN;
	const effMs = effectiveDate.getTime();
	if (currentPeriodEndIso && !Number.isNaN(endMs) && !Number.isNaN(effMs) && effMs >= endMs) {
		return new Date(endMs - 1).toISOString();
	}
	return resolveEffectiveDateIsoForLineItemModify(lineItem, effectiveDate);
}

function normalizeInvoiceCadence(raw: string | undefined): INVOICE_CADENCE | undefined {
	if (!raw) return undefined;
	const u = String(raw).toUpperCase();
	if (u === INVOICE_CADENCE.ARREAR) return INVOICE_CADENCE.ARREAR;
	if (u === INVOICE_CADENCE.ADVANCE) return INVOICE_CADENCE.ADVANCE;
	return undefined;
}

/** Raw `invoice_cadence` from line item row or embedded price (API may set either). */
export function getInvoiceCadenceRawFromLineItem(lineItem: LineItem): string | undefined {
	return lineItem.price?.invoice_cadence ?? (lineItem as LineItem & { invoice_cadence?: string }).invoice_cadence;
}

export function getInvoiceCadenceFromLineItem(lineItem: LineItem): INVOICE_CADENCE | undefined {
	return normalizeInvoiceCadence(getInvoiceCadenceRawFromLineItem(lineItem));
}

/**
 * Default effective date for mid-cycle quantity modify:
 * - Arrear: current billing period start (then clamped to line item active window)
 * - Advance: last instant inside the period — `current_period_end` is exclusive on the API
 */
export function getDefaultEffectiveDateForQuantityModify(
	lineItem: LineItem,
	currentPeriodStartIso: string,
	currentPeriodEndIso: string,
): Date | undefined {
	const cadence = getInvoiceCadenceFromLineItem(lineItem);
	let candidate: Date | undefined;
	if (cadence === INVOICE_CADENCE.ARREAR) {
		const d = new Date(currentPeriodStartIso);
		candidate = Number.isNaN(d.getTime()) ? undefined : d;
	} else if (cadence === INVOICE_CADENCE.ADVANCE) {
		candidate = lastInstantInsideBillingPeriodEnd(currentPeriodEndIso);
	}
	if (!candidate) return undefined;
	return clampEffectiveDateToLineItemActiveWindow(candidate, lineItem);
}
