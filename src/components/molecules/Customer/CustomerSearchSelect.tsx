import React from 'react';
import AsyncSearchableSelect, { AsyncSearchableSelectProps } from '@/components/atoms/Select/AsyncSearchableSelect';
import CustomerApi from '@/api/CustomerApi';
import { Customer, ENTITY_STATUS } from '@/models';
import { SelectOption } from '@/components/atoms/Select/Select';

export interface CustomerSearchSelectProps extends Omit<AsyncSearchableSelectProps<Customer>, 'search' | 'extractors'> {
	/** Maximum number of results to fetch (default: 20) */
	limit?: number;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** Customer ID(s) to exclude from search results */
	excludeId?: string | string[];
	/**
	 * When set, the first option is always this customer labeled "Self" (e.g. invoicing = subscriber).
	 * Omits the synthetic "None" row used by default search mode.
	 */
	selfCustomer?: Customer;
}

/**
 * CustomerSearchSelect - A convenience wrapper around AsyncSearchableSelect
 * pre-configured for searching customers by name and email.
 */
const CustomerSearchSelect: React.FC<CustomerSearchSelectProps> = ({
	limit = 20,
	searchPlaceholder = 'Search for customer...',
	excludeId,
	selfCustomer,
	...props
}) => {
	const searchFn = async (query: string) => {
		const response = await CustomerApi.searchCustomers(query, limit);

		// Convert excludeId to array for easier filtering
		const excludeIds = excludeId ? (Array.isArray(excludeId) ? excludeId : [excludeId]) : [];

		// Filter out excluded customers
		const filteredCustomers = response.items.filter((customer) => !excludeIds.includes(customer.id));

		const rootCustomer: Customer = {
			id: '',
			name: 'None',
			email: '',
			external_id: 'root',
			address_city: '',
			address_country: '',
			address_line1: '',
			address_line2: '',
			address_postal_code: '',
			address_state: '',
			metadata: {},
			environment_id: '',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: '',
			updated_by: '',
			tenant_id: '',
			status: ENTITY_STATUS.PUBLISHED,
		};

		const selfRow: Array<SelectOption & { data: Customer }> = selfCustomer
			? [{ value: selfCustomer.id, label: 'Self', data: selfCustomer }]
			: [];

		const noneRow: Array<SelectOption & { data: Customer }> = selfCustomer
			? []
			: [
					{
						value: rootCustomer.id,
						label: rootCustomer.name,
						data: rootCustomer,
					},
				];

		const items: Array<SelectOption & { data: Customer }> = [
			...noneRow,
			...selfRow,
			...filteredCustomers.map((customer) => ({
				value: customer.id,
				label: customer.name,
				data: customer,
			})),
		];

		return items;
	};

	return (
		<AsyncSearchableSelect<Customer>
			{...props}
			search={{
				searchFn,
				placeholder: searchPlaceholder,
			}}
			extractors={{
				valueExtractor: (customer) => customer.id,
				labelExtractor: (customer) => (selfCustomer && customer.id === selfCustomer.id ? 'Self' : customer.name),
			}}
		/>
	);
};

export default CustomerSearchSelect;
