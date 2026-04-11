import { useQuery } from '@tanstack/react-query';
import { PlanApi } from '@/api/PlanApi';
import FeatureApi from '@/api/FeatureApi';
import { useEnvironment } from '@/hooks/useEnvironment';

/** Invalidate with `queryClient.invalidateQueries({ queryKey: [SIDEBAR_PRICING_PROMO_QUERY_KEY], exact: false })` after plan/feature create or AI setup. */
export const SIDEBAR_PRICING_PROMO_QUERY_KEY = 'sidebar-pricing-promo' as const;

/**
 * Sidebar AI promo: show only while the active environment has no plans and no features yet.
 */
export function useShouldShowSidebarPricingPromo(): boolean {
	const { activeEnvironment } = useEnvironment();
	const environmentId = activeEnvironment?.id ?? null;

	const { data, isLoading, isError } = useQuery({
		queryKey: [SIDEBAR_PRICING_PROMO_QUERY_KEY, environmentId],
		queryFn: async () => {
			const [plansRes, featuresRes] = await Promise.all([
				PlanApi.getPlansByFilter({ limit: 1, offset: 0, filters: [], sort: [] }),
				FeatureApi.getFeaturesByFilter({ limit: 1, offset: 0, filters: [], sort: [] }),
			]);

			const hasPlan = (plansRes.items?.length ?? 0) > 0 || (plansRes.pagination?.total ?? 0) > 0;
			const hasFeature = (featuresRes.items?.length ?? 0) > 0 || (featuresRes.pagination?.total ?? 0) > 0;

			return { hasPlan, hasFeature };
		},
		enabled: !!environmentId,
		// Layout keeps footer mounted; override app-wide refetchOnMount: false so env / catalog changes refresh eligibility.
		staleTime: 30_000,
		refetchOnMount: true,
		refetchOnWindowFocus: true,
	});

	if (!environmentId) return false;
	if (isLoading || isError || !data) return false;
	if (data.hasPlan || data.hasFeature) return false;
	return true;
}
