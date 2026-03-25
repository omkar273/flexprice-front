import React, { useCallback } from 'react';
import AsyncMultiSearchableSelect, { AsyncMultiSearchableSelectProps } from '@/components/atoms/Select/AsyncMultiSearchableSelect';
import CustomerApi from '@/api/CustomerApi';
import { Customer } from '@/models';
import { SelectOption } from '@/components/atoms/Select/Select';

export interface CustomerMultiSearchSelectProps extends Omit<AsyncMultiSearchableSelectProps<Customer>, 'search' | 'extractors'> {
	/** Maximum number of results to fetch (default: 20) */
	limit?: number;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** Customer IDs to exclude from search results (in addition to currently selected) */
	excludeIds?: string[];
}

const CustomerMultiSearchSelect: React.FC<CustomerMultiSearchSelectProps> = ({
	limit = 20,
	searchPlaceholder = 'Search for customer...',
	excludeIds = [],
	value,
	...rest
}) => {
	const searchFn = useCallback(
		async (query: string): Promise<Array<SelectOption & { data: Customer }>> => {
			const response = await CustomerApi.searchCustomers(query, limit);
			const excludeSet = new Set([...excludeIds, ...(value ?? []).map((c) => c.id)]);
			return (response.items ?? [])
				.filter((customer) => !excludeSet.has(customer.id))
				.map((customer) => ({
					value: customer.id,
					label: customer.name,
					description: customer.external_id,
					data: customer,
				}));
		},
		[excludeIds, limit, value],
	);

	return (
		<AsyncMultiSearchableSelect<Customer>
			{...rest}
			value={value}
			search={{
				searchFn,
				placeholder: searchPlaceholder,
			}}
			fetchWhenQueryEmpty
			extractors={{
				valueExtractor: (customer) => customer.id,
				labelExtractor: (customer) => customer.name,
				descriptionExtractor: (customer) => customer.external_id,
			}}
		/>
	);
};

export default CustomerMultiSearchSelect;
