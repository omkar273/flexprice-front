import { useState, useCallback, useRef } from 'react';
import { Customer } from '@/models';
import { Modal, Button, FormHeader } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddInheritedCustomersDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (customers: Customer[]) => void;
	/** Customer IDs already added — excluded from search results */
	excludeIds?: string[];
	/** Shows loading spinner on confirm button while API call is in-flight */
	isLoading?: boolean;
}

const AddInheritedCustomersDialog: React.FC<AddInheritedCustomersDialogProps> = ({
	isOpen,
	onOpenChange,
	onConfirm,
	excludeIds = [],
	isLoading = false,
}) => {
	const [query, setQuery] = useState('');
	const [searchResults, setSearchResults] = useState<Customer[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleQueryChange = useCallback(
		(value: string) => {
			setQuery(value);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			if (!value.trim()) {
				setSearchResults([]);
				return;
			}
			debounceRef.current = setTimeout(async () => {
				setIsSearching(true);
				try {
					const response = await CustomerApi.searchCustomers(value.trim(), 20);
					const filtered = (response.items ?? []).filter(
						(c) => !excludeIds.includes(c.id) && !selectedCustomers.some((s) => s.id === c.id),
					);
					setSearchResults(filtered);
				} catch {
					setSearchResults([]);
				} finally {
					setIsSearching(false);
				}
			}, 300);
		},
		[excludeIds, selectedCustomers],
	);

	const handleSelect = useCallback((customer: Customer) => {
		setSelectedCustomers((prev) => (prev.some((c) => c.id === customer.id) ? prev : [...prev, customer]));
		setQuery('');
		setSearchResults([]);
	}, []);

	const handleRemove = useCallback((customerId: string) => {
		setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
	}, []);

	const handleClose = useCallback(() => {
		setQuery('');
		setSearchResults([]);
		setSelectedCustomers([]);
		onOpenChange(false);
	}, [onOpenChange]);

	const handleConfirm = useCallback(() => {
		if (selectedCustomers.length === 0 || isLoading) return;
		onConfirm(selectedCustomers);
	}, [selectedCustomers, isLoading, onConfirm]);

	return (
		<Modal
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
			className='card bg-white w-[560px] max-w-[90vw]'>
			<div className='space-y-4'>
				<FormHeader title='Add Customers to Inherit Subscription' variant='sub-header' />

				{/* Search input */}
				<div className='space-y-2'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
						<input
							className='w-full pl-9 pr-3 py-2 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
							placeholder='Search by name, email, or ID...'
							value={query}
							onChange={(e) => handleQueryChange(e.target.value)}
						/>
					</div>

					{/* Search results dropdown */}
					{(searchResults.length > 0 || (isSearching && query)) && (
						<div className='border border-gray-200 rounded-[6px] bg-white shadow-sm max-h-48 overflow-y-auto'>
							{isSearching && <div className='px-3 py-2 text-sm text-gray-400'>Searching...</div>}
							{!isSearching &&
								searchResults.map((customer) => (
									<button
										key={customer.id}
										type='button'
										className='w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors'
										onClick={() => handleSelect(customer)}>
										<p className='text-sm font-medium text-gray-900'>{customer.name}</p>
										<p className='text-xs text-gray-500'>{customer.external_id}</p>
									</button>
								))}
							{!isSearching && searchResults.length === 0 && query && (
								<div className='px-3 py-2 text-sm text-gray-400'>No customers found</div>
							)}
						</div>
					)}
				</div>

				{/* Selected customers chips */}
				{selectedCustomers.length > 0 && (
					<div className='space-y-2'>
						<p className='text-sm font-medium text-gray-700'>Selected customers</p>
						<div className='flex flex-wrap gap-2'>
							{selectedCustomers.map((customer) => (
								<div
									key={customer.id}
									className={cn(
										'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm',
										'bg-gray-100 text-gray-800 border border-gray-200',
									)}>
									<span>{customer.name || customer.external_id}</span>
									<button
										type='button'
										onClick={() => handleRemove(customer.id)}
										className='text-gray-400 hover:text-gray-600 transition-colors'
										aria-label={`Remove ${customer.name}`}>
										<X className='h-3.5 w-3.5' />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Footer actions */}
				<div className='flex justify-end gap-2 pt-2'>
					<Button variant='outline' onClick={handleClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button onClick={handleConfirm} disabled={selectedCustomers.length === 0 || isLoading} isLoading={isLoading}>
						{selectedCustomers.length > 0 ? `Add (${selectedCustomers.length})` : 'Add'}
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default AddInheritedCustomersDialog;
