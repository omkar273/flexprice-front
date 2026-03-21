import { FC, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AddButton, Card, CardHeader, Dialog } from '@/components/atoms';
import { Select } from '@/components/atoms';
import { Button } from '@/components/atoms';
import { FlexpriceTable, ColumnData } from '@/components/molecules';
import CustomerApi from '@/api/CustomerApi';
import SubscriptionApi from '@/api/SubscriptionApi';
import { SUBSCRIPTION_TYPE } from '@/models/Subscription';
import type { Customer } from '@/models';
import type { SubscriptionResponse } from '@/types/dto/Subscription';

interface Props {
	subscriptionId: string;
	customerId: string;
	usageCustomerIds: string[];
	onUpdate: (ids: string[]) => void;
	isUpdating: boolean;
}

interface TableRow {
	customerId: string;
	customerName: string;
	externalId: string;
	subscriptionId: string;
	subscriptionType: string;
}

const SubscriptionUsageCustomersSection: FC<Props> = ({ subscriptionId, customerId, usageCustomerIds, onUpdate, isUpdating }) => {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [selectedCustomerId, setSelectedCustomerId] = useState('');

	// Fetch inherited child subscriptions that reference this subscription as parent
	const { data: childSubscriptionsData } = useQuery({
		queryKey: ['inheritedSubscriptions', subscriptionId],
		queryFn: async () => {
			return await SubscriptionApi.listSubscriptions({
				parent_subscription_ids: [subscriptionId],
				subscription_type: SUBSCRIPTION_TYPE.INHERITED,
				limit: 1000,
				offset: 0,
			});
		},
		enabled: !!subscriptionId,
	});

	// Fetch child customers of this subscription's customer
	const { data: childCustomersData } = useQuery({
		queryKey: ['customerChildren', customerId],
		queryFn: async () => {
			return await CustomerApi.getCustomerChildren(customerId);
		},
		enabled: !!customerId,
	});

	const childSubscriptions: SubscriptionResponse[] = childSubscriptionsData?.items ?? [];
	const childCustomers: Customer[] = childCustomersData?.items ?? [];

	// Map customer_id -> subscription for quick lookup
	const customerToSub = useMemo(() => {
		const map = new Map<string, SubscriptionResponse>();
		childSubscriptions.forEach((sub) => {
			map.set(sub.customer_id, sub);
		});
		return map;
	}, [childSubscriptions]);

	// Map customer_id -> customer for name/external_id lookup
	const customerMap = useMemo(() => {
		const map = new Map<string, Customer>();
		childCustomers.forEach((c) => map.set(c.id, c));
		return map;
	}, [childCustomers]);

	const tableData: TableRow[] = useMemo(
		() =>
			usageCustomerIds.map((cid) => {
				const customer = customerMap.get(cid);
				const sub = customerToSub.get(cid);
				return {
					customerId: cid,
					customerName: customer?.name || customer?.external_id || cid,
					externalId: customer?.external_id ?? '--',
					subscriptionId: sub?.id ?? '--',
					subscriptionType: sub?.subscription_type ?? SUBSCRIPTION_TYPE.INHERITED,
				};
			}),
		[usageCustomerIds, customerMap, customerToSub],
	);

	// Options for the add dialog: child customers not already in usageCustomerIds
	const addOptions = useMemo(
		() =>
			childCustomers
				.filter((c) => !usageCustomerIds.includes(c.id))
				.map((c) => ({
					value: c.id,
					label: c.name || c.external_id || c.id,
				})),
		[childCustomers, usageCustomerIds],
	);

	const handleAdd = () => {
		if (selectedCustomerId) {
			onUpdate([...usageCustomerIds, selectedCustomerId]);
			setSelectedCustomerId('');
			setIsAddOpen(false);
		}
	};

	const columns: ColumnData<TableRow>[] = [
		{ title: 'Customer', render: (row) => row.customerName },
		{ title: 'External ID', render: (row) => row.externalId },
		{ title: 'Subscription ID', render: (row) => row.subscriptionId },
		{
			title: 'Type',
			render: (row) => <span className='capitalize text-muted-foreground text-sm'>{row.subscriptionType}</span>,
		},
	];

	return (
		<Card>
			<CardHeader
				title='Usage Customers'
				subtitle='Customers whose usage is aggregated into this subscription for consolidated billing.'
				cta={<AddButton label='Add Usage Customer' onClick={() => setIsAddOpen(true)} disabled={isUpdating || addOptions.length === 0} />}
			/>

			<div className='px-4 pb-4'>
				<div className='rounded-[6px] border border-gray-300'>
					<FlexpriceTable data={tableData} columns={columns} showEmptyRow />
				</div>
			</div>

			<Dialog
				isOpen={isAddOpen}
				onOpenChange={(open) => {
					setIsAddOpen(open);
					if (!open) setSelectedCustomerId('');
				}}
				title='Add Usage Customer'
				description='Select a child customer whose usage will be aggregated for this subscription.'>
				<div className='space-y-4'>
					<Select
						label='Customer'
						placeholder='Select customer'
						options={addOptions}
						value={selectedCustomerId}
						onChange={setSelectedCustomerId}
						noOptionsText='All child customers have been added'
					/>
					<div className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setIsAddOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={!selectedCustomerId || isUpdating}>
							Add
						</Button>
					</div>
				</div>
			</Dialog>
		</Card>
	);
};

export default SubscriptionUsageCustomersSection;
