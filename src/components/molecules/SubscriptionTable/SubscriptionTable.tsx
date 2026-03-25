import { FC, useState } from 'react';
import { ActionButton, Chip } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '../Table';
import formatDate from '@/utils/common/format_date';
import { Subscription, SUBSCRIPTION_STATUS, SUBSCRIPTION_TYPE } from '@/models/Subscription';
import { useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import RedirectCell from '../Table/RedirectCell';
import { Trash2 } from 'lucide-react';
import { SubscriptionResponse } from '@/types/dto/Subscription';
import SubscriptionCancelDialog from '@/components/molecules/SubscriptionCancelDialog/SubscriptionCancelDialog';

interface Props {
	data: Subscription[];
	onEdit?: (subscription: Subscription) => void;
}
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

const SubscriptionTable: FC<Props> = ({ data, onEdit }) => {
	const navigate = useNavigate();
	const [cancelSubscriptionId, setCancelSubscriptionId] = useState<string | null>(null);

	const columns: ColumnData<SubscriptionResponse>[] = [
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
				const label = getSubscriptionStatusChip(row.subscription_status);
				return label;
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
					entityName='Subscription'
					edit={{
						path: `${RouteNames.subscriptions}/${row.id}/edit`,
						onClick: () => onEdit?.(row),
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
	];

	return (
		<>
			<FlexpriceTable
				showEmptyRow
				columns={columns}
				data={data}
				onRowClick={(row) => {
					navigate(`${RouteNames.customers}/${row?.customer_id}/subscription/${row?.id}`);
				}}
			/>
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

export default SubscriptionTable;
