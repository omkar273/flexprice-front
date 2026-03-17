import { useQuery } from '@tanstack/react-query';
import CustomerApi from '@/api/CustomerApi';
import { SUBSCRIPTION_STATUS } from '@/models/Subscription';

const ACTIVE_SUBSCRIPTION_STATUSES = [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIALING];

/**
 * Returns the start of the given date in UTC (00:00:00.000).
 * Use for date-only comparison of expiry vs subscription period end.
 */
export function toDateOnlyUtc(isoOrDate: string | Date): Date {
	const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Adds one calendar day in UTC.
 */
function addOneDayUtc(d: Date): Date {
	const next = new Date(d);
	next.setUTCDate(next.getUTCDate() + 1);
	return next;
}

/**
 * From the customer's subscriptions, compute the minimum allowed credit expiry date:
 * - Only when the customer has at least one active (or trialing) subscription.
 * - Uses the latest current_period_end (date-only) across those subscriptions.
 * - Minimum expiry is the next calendar day after that (expiry must be > period end).
 * - Returns null if no active subscriptions (no restriction).
 */
export function useMinCreditExpiryDate(customerId: string | undefined) {
	const { data: minExpiryDate, isLoading } = useQuery({
		queryKey: ['minCreditExpiryDate', customerId],
		queryFn: async () => {
			if (!customerId) return null;
			const res = await CustomerApi.getCustomerSubscriptions(customerId);
			const active = (res.items || []).filter((s) => ACTIVE_SUBSCRIPTION_STATUSES.includes(s.subscription_status as SUBSCRIPTION_STATUS));
			if (active.length === 0) return null;
			const periodEndDates = active
				.map((s) => s.current_period_end)
				.filter(Boolean)
				.map((iso) => toDateOnlyUtc(iso as string));
			if (periodEndDates.length === 0) return null;
			const maxPeriodEnd = new Date(Math.max(...periodEndDates.map((d) => d.getTime())));
			return addOneDayUtc(maxPeriodEnd);
		},
		enabled: !!customerId,
		staleTime: 2 * 60 * 1000,
	});

	return { minExpiryDate: minExpiryDate ?? null, isLoading };
}
