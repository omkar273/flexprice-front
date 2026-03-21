import { useParams, useNavigate, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import CustomerApi from '@/api/CustomerApi';
import { Card, Loader } from '@/components/atoms';
import FlexpriceTable, { ColumnData } from '@/components/molecules/Table';
import { RouteNames } from '@/core/routes/Routes';
import type { CustomerResponse } from '@/types/dto';
import { ExternalLink, Users } from 'lucide-react';
import { useMemo } from 'react';

const CustomerHierarchyTab = () => {
	const { id: customerId } = useParams();
	const navigate = useNavigate();

	const {
		data: childrenResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['customerChildren', customerId],
		queryFn: () => CustomerApi.getCustomerChildren(customerId!),
		enabled: !!customerId,
	});

	const children = childrenResponse?.items ?? [];
	const total = childrenResponse?.pagination?.total ?? children.length;

	const columns: ColumnData<CustomerResponse>[] = useMemo(
		() => [
			{ title: 'Name', fieldName: 'name', width: '280px' },
			{ title: 'External ID', fieldName: 'external_id', width: '200px' },
			{ title: 'Email', fieldName: 'email', width: '240px' },
			{
				title: '',
				width: '50px',
				fieldVariant: 'interactive',
				render: (row) => (
					<Link
						to={`${RouteNames.customers}/${row.id}`}
						className='inline-flex items-center gap-1 text-primary hover:underline text-sm'
						onClick={(e) => e.stopPropagation()}>
						View
						<ExternalLink className='w-3.5 h-3.5' />
					</Link>
				),
			},
		],
		[],
	);

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-[200px]'>
				<Loader />
			</div>
		);
	}

	if (error || !childrenResponse) {
		return (
			<div className='rounded-lg border border-border bg-card px-4 py-6 text-center'>
				<p className='text-sm text-muted-foreground'>Failed to load child customers. Please try again.</p>
			</div>
		);
	}

	if (children.length === 0) {
		return (
			<div className='rounded-lg border border-border bg-card px-4 py-6 text-center'>
				<p className='text-sm text-muted-foreground'>No child customers.</p>
			</div>
		);
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center gap-2'>
				<Users className='w-4 h-4 text-muted-foreground' />
				<span className='text-sm font-medium'>
					{total} child customer{total === 1 ? '' : 's'}
				</span>
			</div>
			<Card variant='notched' className='overflow-hidden'>
				<FlexpriceTable
					columns={columns}
					data={children}
					onRowClick={(row: CustomerResponse) => navigate(`${RouteNames.customers}/${row.id}`)}
					showEmptyRow={false}
				/>
			</Card>
			{total > children.length && (
				<p className='text-muted-foreground text-xs'>
					Showing {children.length} of {total}
				</p>
			)}
		</div>
	);
};

export default CustomerHierarchyTab;
