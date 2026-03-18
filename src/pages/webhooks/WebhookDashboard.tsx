import { Loader, Page } from '@/components/atoms';
import { ApiDocsContent } from '@/components/molecules';
import WebhookApi from '@/api/WebhookApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AppPortal } from 'svix-react';
import { EmptyPage } from '@/components/organisms';
import { useMemo, useEffect } from 'react';
import useEnvironment from '@/hooks/useEnvironment';

const WebhookDashboard = () => {
	const queryClient = useQueryClient();

	const { activeEnvironment } = useEnvironment();

	const { data, isLoading, isError, error } = useQuery({
		queryKey: ['webhookDashboardUrl', activeEnvironment?.id],
		queryFn: async () => await WebhookApi.getWebhookDashboardUrl(),
		// Cache for 5 minutes to reduce API calls
		staleTime: 5 * 60 * 1000,
		// Keep data fresh for 10 minutes
		gcTime: 10 * 60 * 1000,
		// Retry failed requests up to 2 times
		retry: 2,
		// Retry with exponential backoff
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		// Refetch in background when window regains focus
		refetchOnWindowFocus: true,
		// Refetch when network reconnects
		refetchOnReconnect: true,
		enabled: !!activeEnvironment?.id,
	});

	// Preload the dashboard URL when component mounts
	useEffect(() => {
		// Prefetch the data if not already cached
		if (!queryClient.getQueryData(['webhookDashboardUrl', activeEnvironment?.id])) {
			queryClient.prefetchQuery({
				queryKey: ['webhookDashboardUrl', activeEnvironment?.id],
				queryFn: async () => await WebhookApi.getWebhookDashboardUrl(),
				staleTime: 5 * 60 * 1000,
			});
		}
	}, [queryClient, activeEnvironment?.id]);

	// Memoize the AppPortal props to prevent unnecessary re-renders
	const appPortalProps = useMemo(
		() => ({
			primaryColor: '#000000',
			style: {
				width: '100%',
				height: '100%',
				color: '#000000',
				border: 'none',
				backgroundColor: '#000000',
			},
			url: data?.url ?? '',
		}),
		[data?.url],
	);

	if (isLoading) {
		return (
			<Page className='h-full w-full' heading='Webhooks'>
				<ApiDocsContent tags={['Webhooks']} />
				<div className='flex items-center justify-center h-96'>
					<Loader />
				</div>
			</Page>
		);
	}

	if (isError) {
		toast.error(`Error fetching webhook dashboard: ${error?.message || 'Unknown error'}`);
		return (
			<Page className='h-full w-full' heading='Webhooks'>
				<ApiDocsContent tags={['Webhooks']} />
				<EmptyPage
					heading='Webhooks'
					emptyStateCard={{
						heading: 'Unable to Load Webhooks',
						description: 'There was an error loading the webhook dashboard. Please try refreshing the page.',
					}}
				/>
			</Page>
		);
	}

	if (!data?.svix_enabled) {
		return (
			<Page className='h-full w-full' heading='Webhooks'>
				<ApiDocsContent tags={['Webhooks']} />
				<EmptyPage
					heading='Webhooks'
					emptyStateCard={{
						heading: 'Webhooks',
						description: 'Webhooks are not enabled. Please contact support to enable webhooks.',
					}}
				/>
			</Page>
		);
	}

	return (
		<Page className='h-full w-full' heading='Webhooks'>
			<ApiDocsContent tags={['Webhooks']} />
			<AppPortal {...appPortalProps} />
		</Page>
	);
};

export default WebhookDashboard;
