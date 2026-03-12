import { Page, Chip } from '@/components/atoms';
import { ApiDocsContent, RedirectCell } from '@/components/molecules';
import { ColumnData } from '@/components/molecules/Table';
import InvoiceTableMenu from '@/components/molecules/InvoiceTable/InvoiceTableMenu';
import { QueryableDataArea } from '@/components/organisms';
import GUIDES from '@/constants/guides';
import InvoiceApi from '@/api/InvoiceApi';
import {
	FilterField,
	FilterFieldType,
	DEFAULT_OPERATORS_PER_DATA_TYPE,
	DataType,
	FilterOperator,
	SortOption,
	SortDirection,
	FilterCondition,
} from '@/types/common/QueryBuilder';
import { searchCustomersForFilter } from '@/utils/filterSearchHelpers';
import { ENTITY_STATUS } from '@/models';
import { Invoice, INVOICE_STATUS, INVOICE_TYPE } from '@/models/Invoice';
import { PAYMENT_STATUS } from '@/constants';
import { useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import { formatDateShort, getCurrencySymbol } from '@/utils/common/helper_functions';
import { useMemo } from 'react';

const sortingOptions: SortOption[] = [
	{
		field: 'invoice_number',
		label: 'Invoice Number',
		direction: SortDirection.ASC,
	},
	{
		field: 'amount_due',
		label: 'Amount Due',
		direction: SortDirection.DESC,
	},
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
	{
		field: 'due_date',
		label: 'Due Date',
		direction: SortDirection.ASC,
	},
];

const filterOptions: FilterField[] = [
	{
		field: 'invoice_number',
		label: 'Invoice Number',
		fieldType: FilterFieldType.INPUT,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.STRING],
		dataType: DataType.STRING,
	},
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
		field: 'invoice_status',
		label: 'Invoice Status',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		options: [
			{ value: INVOICE_STATUS.DRAFT, label: 'Draft' },
			{ value: INVOICE_STATUS.FINALIZED, label: 'Finalized' },
			{ value: INVOICE_STATUS.VOIDED, label: 'Voided' },
		],
	},
	{
		field: 'payment_status',
		label: 'Payment Status',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		options: [
			{ value: PAYMENT_STATUS.PENDING, label: 'Pending' },
			{ value: PAYMENT_STATUS.PROCESSING, label: 'Processing' },
			{ value: PAYMENT_STATUS.INITIATED, label: 'Initiated' },
			{ value: PAYMENT_STATUS.SUCCEEDED, label: 'Succeeded' },
			{ value: PAYMENT_STATUS.FAILED, label: 'Failed' },
			{ value: PAYMENT_STATUS.REFUNDED, label: 'Refunded' },
			{ value: PAYMENT_STATUS.PARTIALLY_REFUNDED, label: 'Partially Refunded' },
		],
	},
	{
		field: 'invoice_type',
		label: 'Invoice Type',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		options: [
			{ value: INVOICE_TYPE.SUBSCRIPTION, label: 'Subscription' },
			{ value: INVOICE_TYPE.ONE_OFF, label: 'One Off' },
			{ value: INVOICE_TYPE.CREDIT, label: 'Credit' },
		],
	},
	{
		field: 'created_at',
		label: 'Created At',
		fieldType: FilterFieldType.DATEPICKER,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
		dataType: DataType.DATE,
	},
	{
		field: 'due_date',
		label: 'Due Date',
		fieldType: FilterFieldType.DATEPICKER,
		operators: DEFAULT_OPERATORS_PER_DATA_TYPE[DataType.DATE],
		dataType: DataType.DATE,
	},
	{
		field: 'status',
		label: 'Status',
		fieldType: FilterFieldType.MULTI_SELECT,
		operators: [FilterOperator.IN, FilterOperator.NOT_IN],
		dataType: DataType.ARRAY,
		options: [
			{ value: ENTITY_STATUS.PUBLISHED, label: 'Active' },
			{ value: ENTITY_STATUS.ARCHIVED, label: 'Inactive' },
		],
	},
];

const initialFilters: FilterCondition[] = [
	{
		field: 'invoice_number',
		operator: FilterOperator.CONTAINS,
		valueString: '',
		dataType: DataType.STRING,
		id: 'initial-invoice-number',
	},
	{
		field: 'status',
		operator: FilterOperator.IN,
		valueArray: [ENTITY_STATUS.PUBLISHED],
		dataType: DataType.ARRAY,
		id: 'initial-status',
	},
];

const initialSorts: SortOption[] = [
	{
		field: 'created_at',
		label: 'Created At',
		direction: SortDirection.DESC,
	},
];

const getStatusChip = (status: string) => {
	switch (status.toUpperCase()) {
		case INVOICE_STATUS.VOIDED:
			return <Chip variant='default' label='Void' />;
		case INVOICE_STATUS.FINALIZED:
			return <Chip variant='success' label='Finalized' />;
		case INVOICE_STATUS.DRAFT:
			return <Chip variant='default' label='Draft' />;
		default:
			return <Chip variant='default' label='Draft' />;
	}
};

const getPaymentStatusChip = (status: string) => {
	switch (status.toUpperCase()) {
		case PAYMENT_STATUS.PENDING:
			return <Chip variant='warning' label='Pending' />;
		case PAYMENT_STATUS.INITIATED:
			return <Chip variant='warning' label='Initiated' />;
		case PAYMENT_STATUS.SUCCEEDED:
			return <Chip variant='success' label='Succeeded' />;
		case PAYMENT_STATUS.FAILED:
			return <Chip variant='failed' label='Failed' />;
		case PAYMENT_STATUS.REFUNDED:
			return <Chip variant='default' label='Refunded' />;
		case PAYMENT_STATUS.PARTIALLY_REFUNDED:
			return <Chip variant='default' label='Partially Refunded' />;
		default:
			return <Chip variant='default' label='Unknown' />;
	}
};

const InvoicesPage = () => {
	const navigate = useNavigate();

	const columns: ColumnData<Invoice>[] = useMemo(
		() => [
			{
				fieldName: 'invoice_number',
				title: 'Invoice ID',
			},
			{
				title: 'Amount',
				render: (row) => <span>{`${getCurrencySymbol(row.currency)}${row.amount_due}`}</span>,
			},
			{
				title: 'Invoice Status',
				render: (row: Invoice) => getStatusChip(row.invoice_status),
			},
			{
				title: 'Customer',
				render: (row: Invoice) => {
					if (!row.customer?.name) {
						return '--';
					}
					return <RedirectCell redirectUrl={`${RouteNames.customers}/${row.customer?.id}`}>{row.customer?.name}</RedirectCell>;
				},
			},
			{
				title: 'Payment Status',
				render: (row: Invoice) => getPaymentStatusChip(row.payment_status),
			},
			{
				title: 'Due Date',
				render: (row: Invoice) => <span>{row.due_date ? formatDateShort(row.due_date) : '--'}</span>,
			},
			{
				fieldVariant: 'interactive',
				hideOnEmpty: true,
				render: (row: Invoice) => {
					return <InvoiceTableMenu data={row} />;
				},
			},
		],
		[],
	);

	return (
		<Page heading='Invoices'>
			<ApiDocsContent tags={['Invoices']} />
			<QueryableDataArea<Invoice>
				queryConfig={{
					filterOptions,
					sortOptions: sortingOptions,
					initialFilters,
					initialSorts,
					debounceTime: 300,
				}}
				dataConfig={{
					queryKey: 'fetchInvoices',
					fetchFn: async (params) => InvoiceApi.listInvoices(params),
					probeFetchFn: async (params) =>
						InvoiceApi.listInvoices({
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
						navigate(`/billing/invoices/${row.id}`);
					},
					showEmptyRow: true,
				}}
				paginationConfig={{
					unit: 'Invoices',
				}}
				emptyStateConfig={{
					heading: 'Invoices',
					description: 'Generate an invoice to initiate billing and manage customer payments.',
					tags: ['Invoices'],
					tutorials: GUIDES.invoices.tutorials,
				}}
			/>
		</Page>
	);
};

export default InvoicesPage;
