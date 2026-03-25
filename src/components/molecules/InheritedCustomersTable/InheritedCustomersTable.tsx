import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { AddButton, FormHeader } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import SubscriptionApi from '@/api/SubscriptionApi';
import { SUBSCRIPTION_TYPE, SUBSCRIPTION_STATUS } from '@/models/Subscription';
import { SubscriptionResponse } from '@/types/dto/Subscription';
import { RouteNames } from '@/core/routes/Routes';
import { format } from 'date-fns';

interface InheritedCustomersTableProps {
	parentSubscriptionId: string;
	onAddCustomers: () => void;
	/** Called after fetch with customer IDs of all loaded inherited subscriptions */
	onCustomerIdsLoaded?: (ids: string[]) => void;
}

const InheritedCustomersTable: React.FC<InheritedCustomersTableProps> = ({ parentSubscriptionId, onAddCustomers, onCustomerIdsLoaded }) => {
	const navigate = useNavigate();

	const { data, isLoading } = useQuery({
		// IMPORTANT: this query key must match refetchQueries(['inheritedSubscriptions', ...])
		// in CustomerSubscriptionEditPage's executeInheritance onSuccess handler
		queryKey: ['inheritedSubscriptions', parentSubscriptionId],
		queryFn: () =>
			SubscriptionApi.searchSubscriptions({
				parent_subscription_ids: [parentSubscriptionId],
				subscription_types: [SUBSCRIPTION_TYPE.INHERITED],
				subscription_status: [SUBSCRIPTION_STATUS.ACTIVE],
			}),
		enabled: !!parentSubscriptionId,
	});

	// Lift loaded customer IDs to parent so it can pass them as excludeIds to the dialog
	useEffect(() => {
		if (data?.items && onCustomerIdsLoaded) {
			const ids = data.items.map((sub) => sub.customer_id).filter((id): id is string => !!id);
			onCustomerIdsLoaded(ids);
		}
	}, [data, onCustomerIdsLoaded]);

	const columns: ColumnData<SubscriptionResponse>[] = [
		{
			title: 'Customer',
			render: (row) => (
				<div>
					<button
						type='button'
						className='text-sm font-medium text-primary hover:underline text-left'
						onClick={(e) => {
							e.stopPropagation();
							navigate(`${RouteNames.customers}/${row.customer_id}`);
						}}>
						{row.customer?.name || row.customer_id}
					</button>
					{row.customer?.external_id && <p className='text-xs text-gray-500'>{row.customer.external_id}</p>}
				</div>
			),
		},
		{
			title: 'Status',
			render: (row) => (
				<span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize'>
					{row.subscription_status}
				</span>
			),
		},
		{
			title: 'Start Date',
			render: (row) => (
				<span className='text-sm text-gray-700'>{row.start_date ? format(new Date(row.start_date), 'MMM d, yyyy') : '—'}</span>
			),
		},
		{
			title: 'Plan',
			render: (row) => (
				<button
					type='button'
					className='text-sm font-medium text-primary hover:underline text-left'
					onClick={(e) => {
						e.stopPropagation();
						navigate(`${RouteNames.customers}/${row.customer_id}/subscription/${row.id}`);
					}}>
					{row.plan?.name || row.plan_id}
				</button>
			),
		},
	];

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between'>
				<FormHeader title='Inherited Customers' variant='sub-header' />
				<AddButton onClick={onAddCustomers} label='Add Customers' />
			</div>
			<FlexpriceTable columns={columns} data={data?.items ?? []} showEmptyRow />
			{isLoading && <p className='text-sm text-gray-400 text-center py-4'>Loading...</p>}
			{!isLoading && (data?.items ?? []).length === 0 && (
				<p className='text-sm text-gray-400 text-center py-4'>No inherited customers yet</p>
			)}
		</div>
	);
};

export default InheritedCustomersTable;
