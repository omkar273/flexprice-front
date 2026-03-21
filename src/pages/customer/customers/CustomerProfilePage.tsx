import { Outlet, useNavigate, useParams, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { useBreadcrumbsStore } from '@/store';
import { useQuery } from '@tanstack/react-query';
import CustomerApi from '@/api/CustomerApi';
import { Page } from '@/components/atoms';
import { cn } from '@/lib/utils';
import { ApiDocsContent } from '@/components/molecules';
import { AlertCircle } from 'lucide-react';
import { ENTITY_STATUS } from '@/models';
import CustomerHeader from '@/components/molecules/Customer/CustomerHeader';
import { RouteNames } from '@/core/routes/Routes';

const baseTabs = [
	{ id: '', label: 'Overview' },
	{ id: 'wallet', label: 'Wallet' },
	{ id: 'invoice', label: 'Invoice' },
	{ id: 'information', label: 'Information' },
	{ id: 'tax-association', label: 'Tax' },
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'usage-events', label: 'Usage Events' },
] as const;

const hierarchyTab = { id: 'hierarchy' as const, label: 'Hierarchy' };

type TabId = (typeof baseTabs)[number]['id'] | 'hierarchy';

const allTabIds: TabId[] = [...baseTabs.map((t) => t.id), 'hierarchy'];

const getActiveTab = (pathTabId: string): TabId => {
	return allTabIds.includes(pathTabId as TabId) ? (pathTabId as TabId) : baseTabs[0].id;
};

const CustomerProfilePage = () => {
	const { id: customerId } = useParams();
	const location = useLocation();
	const [activeTab, setActiveTab] = useState<TabId>(baseTabs[0]?.id);
	const navigate = useNavigate();

	const { data: customer, isLoading } = useQuery({
		queryKey: ['fetchCustomerDetails', customerId],
		queryFn: async () => await CustomerApi.getCustomerById(customerId!),
	});

	const { data: childrenResponse } = useQuery({
		queryKey: ['customerChildren', customerId],
		queryFn: () => CustomerApi.getCustomerChildren(customerId!),
		enabled: !!customerId,
	});

	const hasChildren = (childrenResponse?.items?.length ?? 0) > 0;
	const visibleTabs = hasChildren ? [...baseTabs, hierarchyTab] : baseTabs;

	const { updateBreadcrumb, setSegmentLoading } = useBreadcrumbsStore();
	const isArchived = customer?.status === ENTITY_STATUS.ARCHIVED;

	// Handle tab changes based on URL
	useEffect(() => {
		const currentPath = location.pathname.split('/');
		const pathTabId = currentPath[4] || '';
		const newActiveTab = getActiveTab(pathTabId);
		setActiveTab(newActiveTab);
	}, [location.pathname]);

	// Update breadcrumbs based on active tab
	useEffect(() => {
		// Set loading state for tab segment if we're going to show it
		if (activeTab !== '') {
			setSegmentLoading(3, true);
		}

		// Find the tab label for the active tab
		const activeTabData = visibleTabs.find((tab) => tab.id === activeTab);
		setSegmentLoading(2, true);

		if (activeTab !== '' && activeTabData) {
			// Update breadcrumb with tab name for non-overview tabs
			updateBreadcrumb(3, activeTabData.label);
		}
		if (customer?.external_id) {
			updateBreadcrumb(2, customer.external_id);
		}
	}, [activeTab, updateBreadcrumb, setSegmentLoading, customer, location.pathname, hasChildren]);

	const onTabChange = (tabId: TabId) => {
		navigate(`${RouteNames.customers}/${customerId}/${tabId}`);
	};

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-[400px]'>
				<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
			</div>
		);
	}

	return (
		<Page className='space-y-6'>
			<ApiDocsContent tags={['Customers']} />
			<CustomerHeader customerId={customerId!} />

			{isArchived && (
				<div className='flex mt-4 items-center gap-2 py-3 px-4	 bg-yellow-50 border border-yellow-200 rounded-lg'>
					<AlertCircle className='text-yellow-500 size-5' />
					<div>
						<p className='text-sm text-yellow-700'>
							This customer is Inactive. You can only view their details but cannot make any changes.
						</p>
					</div>
				</div>
			)}

			<div className='border-b border-border mt-4 mb-6'>
				<nav className='flex space-x-4' aria-label='Tabs'>
					{visibleTabs.map((tab, index) => {
						return (
							<button
								key={tab.id}
								onClick={() => onTabChange(tab.id)}
								className={cn(
									'px-4 py-2 text-sm font-normal transition-colors focus-visible:outline-none',
									index === 0 && 'px-0',
									activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
									// isDisabled && 'opacity-50 cursor-not-allowed hover:text-muted-foreground',
								)}
								role='tab'
								aria-selected={activeTab === tab.id}>
								{tab.label}
								{/* {isDisabled && (
									<span className='ml-2 text-xs text-yellow-600'>(Archived)</span>
								)} */}
							</button>
						);
					})}
				</nav>
			</div>
			<Outlet context={{ isArchived }} />
		</Page>
	);
};

export default CustomerProfilePage;
