import { Page, ActionButton, Chip } from '@/components/atoms';
import { ApiDocsContent, RedirectCell } from '@/components/molecules';
import { ColumnData } from '@/components/molecules/Table';
import { QueryableDataArea } from '@/components/organisms';
import GUIDES from '@/constants/guides';
import SubscriptionApi from '@/api/SubscriptionApi';
import {
	FilterField,
	FilterFieldType,
	DataType,
	FilterOperator,
	SortOption,
	SortDirection,
	FilterCondition,
} from '@/types/common/QueryBuilder';
import { BILLING_CADENCE } from '@/models/Invoice';
import { BILLING_PERIOD } from '@/constants/constants';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_TYPE } from '@/models/Subscription';
import { toSentenceCase } from '@/utils/common/helper_functions';
import { EXPAND } from '@/models/expand';
import { generateExpandQueryParams } from '@/utils/common/api_helper';
import { searchCustomersForFilter, searchPlansForFilter } from '@/utils/filterSearchHelpers';
import { useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import formatDate from '@/utils/common/format_date';
import { Trash2 } from 'lucide-react';
import { SubscriptionResponse } from '@/types/dto/Subscription';
import { useMemo, useState } from 'react';
import SubscriptionCancelDialog from '@/components/molecules/SubscriptionCancelDialog/SubscriptionCancelDialog';

const sortingOptions: SortOption[] = [
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
	{
		field: 'updated_at',
		label: 'Updated At',
		direction: SortDirection.DESC,
	},
	{
		field: 'start_date',
		label: 'Start Date',
		direction: SortDirection.DESC,
	},
	{
		field: 'end_date',
		label: 'End Date',
		direction: SortDirection.DESC,
	},
];

const filterOptions: FilterField[] = [
	{
		field: 'customer_id',
		label: 'Customer',
		fieldType: FilterFieldType.ASYNC_MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		asyncConfig: {
			searchFn: searchCustomersForFilter,
		},
	},
	{
		field: 'plan_id',
		label: 'Plan',
		fieldType: FilterFieldType.ASYNC_MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		asyncConfig: {
			searchFn: searchPlansForFilter,
		},
	},
	{
		field: 'subscription_status',
		label: 'Status',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		options: [
			{ value: SUBSCRIPTION_STATUS.ACTIVE, label: 'Active' },
			{ value: SUBSCRIPTION_STATUS.CANCELLED, label: 'Cancelled' },
			{ value: SUBSCRIPTION_STATUS.INCOMPLETE, label: 'Incomplete' },
			{ value: SUBSCRIPTION_STATUS.TRIALING, label: 'Trialing' },
		],
	},
	{
		field: 'billing_cadence',
		label: 'Billing Cadence',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN],
		dataType: DataType.ARRAY,
		options: Object.values(BILLING_CADENCE).map((cadence) => ({
			value: cadence,
			label: cadence.charAt(0).toUpperCase() + cadence.slice(1).toLowerCase(),
		})),
	},
	{
		field: 'billing_period',
		label: 'Billing Period',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN],
		dataType: DataType.ARRAY,
		options: Object.values(BILLING_PERIOD).map((period) => ({
			value: period,
			label: toSentenceCase(period.replace('_', ' ')),
		})),
	},
];

const initialFilters: FilterCondition[] = [
	{
		field: 'subscription_status',
		operator: FilterOperator.IN,
		valueArray: [SUBSCRIPTION_STATUS.ACTIVE],
		dataType: DataType.ARRAY,
		id: 'initial-status',
	},
];

const initialSorts: SortOption[] = [
	{
		field: 'updated_at',
		label: 'Updated At',
		direction: SortDirection.DESC,
	},
];

const getSubscriptionStatusChip = (status: SUBSCRIPTION_STATUS) => {
	switch (status) {
		case SUBSCRIPTION_STATUS.ACTIVE:
			return <Chip variant='success' label='Active' />;
		case SUBSCRIPTION_STATUS.CANCELLED:
			return <Chip variant='failed' label='Cancelled' />;
		case SUBSCRIPTION_STATUS.INCOMPLETE:
			return <Chip variant='warning' label='Incomplete' />;
		case SUBSCRIPTION_STATUS.TRIALING:
			return <Chip variant='warning' label='Trialing' />;
		case SUBSCRIPTION_STATUS.DRAFT:
			return <Chip variant='warning' label='Draft' />;
		default:
			return <Chip variant='default' label='Inactive' />;
	}
};

const SubscriptionsPage = () => {
	const navigate = useNavigate();
	const [cancelSubscriptionId, setCancelSubscriptionId] = useState<string | null>(null);

	const columns: ColumnData<SubscriptionResponse>[] = useMemo(
		() => [
			{
				title: 'Customer',
				render: (row) => (
					<RedirectCell redirectUrl={`${RouteNames.customers}/${row.customer_id}`}>{row.customer?.name || row.customer_id}</RedirectCell>
				),
			},
			{
				title: 'Plan',
				render: (row) => <RedirectCell redirectUrl={`${RouteNames.plan}/${row.plan_id}`}>{row.plan?.name || row.plan_id}</RedirectCell>,
			},
			{
				title: 'Status',
				render: (row) => {
					return getSubscriptionStatusChip(row.subscription_status);
				},
			},
			{
				title: 'Start Date',
				render: (row) => formatDate(row.start_date),
			},
			{
				title: 'Renewal Date',
				render: (row) => formatDate(row.current_period_end),
			},
			{
				fieldVariant: 'interactive',
				render: (row) => (
					<ActionButton
						id={row.id}
						deleteMutationFn={async () => Promise.resolve()}
						refetchQueryKey='fetchSubscriptions'
						isArchiveDisabled={true}
						entityName='Subscription'
						edit={{
							path: `${RouteNames.subscriptions}/${row.id}/edit`,
						}}
						archive={{
							enabled: false,
						}}
						customActions={[
							{
								text: 'Cancel',
								icon: <Trash2 />,
								enabled: row.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED && row.subscription_type !== SUBSCRIPTION_TYPE.INHERITED,
								onClick: () => setCancelSubscriptionId(row.id),
							},
						]}
					/>
				),
			},
		],
		[],
	);

	return (
		<>
			<Page heading='Subscriptions'>
				<ApiDocsContent tags={['Subscriptions', 'Subscription']} />
				<QueryableDataArea<SubscriptionResponse>
					queryConfig={{
						filterOptions,
						sortOptions: sortingOptions,
						initialFilters,
						initialSorts,
						debounceTime: 300,
					}}
					dataConfig={{
						queryKey: 'fetchSubscriptions',
						fetchFn: async (params) =>
							SubscriptionApi.searchSubscriptions({
								...params,
								expand: generateExpandQueryParams([EXPAND.CUSTOMER]),
							}),
						probeFetchFn: async (params) =>
							SubscriptionApi.searchSubscriptions({
								...params,
								limit: 1,
								offset: 0,
								filters: [],
								sort: [],
							}),
					}}
					tableConfig={{
						columns,
						onRowClick: (row) => {
							navigate(`${RouteNames.customers}/${row?.customer_id}/subscription/${row?.id}`);
						},
						showEmptyRow: true,
					}}
					paginationConfig={{
						unit: 'Subscriptions',
					}}
					emptyStateConfig={{
						heading: 'Subscriptions',
						description: 'Create your first subscription to start billing your customers.',
						buttonLabel: 'Create Subscription',
						tags: ['Subscriptions', 'Subscription'],
						tutorials: GUIDES.customers.tutorials,
					}}
				/>
			</Page>
			<SubscriptionCancelDialog
				isOpen={!!cancelSubscriptionId}
				onOpenChange={(open) => {
					if (!open) {
						setCancelSubscriptionId(null);
					}
				}}
				subscriptionId={cancelSubscriptionId}
				refetchQueryKeys={['fetchSubscriptions']}
			/>
		</>
	);
};

export default SubscriptionsPage;
