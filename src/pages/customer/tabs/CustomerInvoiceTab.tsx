import { AddButton, Card, CardHeader, Loader, NoDataCard, ShortPagination } from '@/components/atoms';
import { ApiDocsContent, CustomerInvoiceTable } from '@/components/molecules';
import InvoiceApi from '@/api/InvoiceApi';
import CustomerApi from '@/api/CustomerApi';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useOutletContext } from 'react-router';
import { Invoice as InvoiceModel } from '@/models/Invoice';
import { RouteNames } from '@/core/routes/Routes';
import { useMemo } from 'react';
import Customer from '@/models/Customer';
import usePagination from '@/hooks/usePagination';

const CustomerInvoiceTab = () => {
	const { id: customerId } = useParams();
	const navigate = useNavigate();
	const { limit, offset, page } = usePagination();

	const { data, isLoading } = useQuery({
		queryKey: ['invoice', customerId, page],
		queryFn: async () => {
			return await InvoiceApi.getCustomerInvoices(customerId!, { limit, offset });
		},
		enabled: !!customerId,
	});

	// Collect subscription customer IDs that differ from the current customer
	const subCustIds = useMemo(() => {
		const ids = new Set<string>();
		for (const inv of data?.items ?? []) {
			if (inv.subscription_customer_id && inv.subscription_customer_id !== inv.customer_id) {
				ids.add(inv.subscription_customer_id);
			}
		}
		return [...ids];
	}, [data?.items]);

	const { data: subCustomersData } = useQuery({
		queryKey: ['subscriptionCustomers', subCustIds],
		queryFn: async () => {
			const res = await CustomerApi.getCustomers({ customer_ids: subCustIds, limit: subCustIds.length });
			return res.items ?? [];
		},
		enabled: subCustIds.length > 0,
	});

	const enrichedInvoices = useMemo(() => {
		if (!data?.items) return [];
		const custMap = new Map<string, Customer>();
		for (const c of subCustomersData ?? []) {
			custMap.set(c.id, c);
		}
		return data.items.map((inv) => {
			if (inv.subscription_customer_id && inv.subscription_customer_id !== inv.customer_id) {
				return { ...inv, subscription_customer: custMap.get(inv.subscription_customer_id) };
			}
			return inv;
		});
	}, [data?.items, subCustomersData]);

	const { isArchived } = useOutletContext<{ isArchived: boolean }>();

	const handleShowDetails = (invoice: InvoiceModel) => {
		navigate(`${invoice.id}`);
	};

	if (isLoading) {
		return <Loader />;
	}

	if (data?.items?.length === 0) {
		return (
			<NoDataCard
				title='Invoices'
				subtitle='No invoices found'
				cta={
					!isArchived && (
						<AddButton
							label='Add Invoice'
							onClick={() => {
								navigate(`${RouteNames.customers}/${customerId}/invoices/create`);
							}}
						/>
					)
				}
			/>
		);
	}
	return (
		<div>
			<ApiDocsContent tags={['Invoices']} />
			<Card variant='notched'>
				<CardHeader
					title='Invoices'
					cta={
						!isArchived && (
							<AddButton
								label='Add Invoice'
								onClick={() => {
									navigate(`${RouteNames.customers}/${customerId}/invoices/create`);
								}}
							/>
						)
					}
				/>
				<CustomerInvoiceTable onRowClick={handleShowDetails} customerId={customerId} data={enrichedInvoices} />
				<ShortPagination unit='Invoices' totalItems={data?.pagination.total ?? 0} />
			</Card>
		</div>
	);
};

export default CustomerInvoiceTab;
