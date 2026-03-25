import { useState, useCallback } from 'react';
import { Customer } from '@/models';
import { Modal, Button, FormHeader } from '@/components/atoms';
import CustomerMultiSearchSelect from '@/components/molecules/Customer/CustomerMultiSearchSelect';
import { X, Search, ChevronDown } from 'lucide-react';
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
	const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);

	const handleRemove = useCallback((customerId: string) => {
		setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
	}, []);

	const handleClose = useCallback(() => {
		setSelectedCustomers([]);
		onOpenChange(false);
	}, [onOpenChange]);

	const handleConfirm = useCallback(() => {
		if (selectedCustomers.length === 0 || isLoading) return;
		onConfirm(selectedCustomers);
	}, [selectedCustomers, isLoading, onConfirm]);

	const searchPlaceholder = 'Search by name, email, or ID...';

	return (
		<Modal
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
			className='card bg-white w-[560px] max-w-[90vw]'>
			<div className='space-y-4'>
				<FormHeader title='Add Customers to Inherit Subscription' variant='sub-header' />

				<div className='space-y-2'>
					<CustomerMultiSearchSelect
						value={selectedCustomers}
						onChange={setSelectedCustomers}
						excludeIds={excludeIds}
						fetchWhenQueryEmpty={false}
						minSearchLength={1}
						shortQueryHint='Type to search…'
						disabled={isLoading}
						searchPlaceholder={searchPlaceholder}
						display={{
							placeholder: searchPlaceholder,
							className: 'rounded-[6px] border-gray-300 justify-start gap-2',
							trigger: (
								<>
									<Search className='h-4 w-4 text-gray-400 shrink-0' />
									<span
										className={cn(
											'truncate flex-1 text-left text-sm',
											selectedCustomers.length === 0 ? 'text-muted-foreground' : 'text-foreground',
										)}>
										{selectedCustomers.length === 0
											? searchPlaceholder
											: selectedCustomers.length === 1
												? selectedCustomers[0].name
												: `${selectedCustomers.length} selected`}
									</span>
									<ChevronDown className='h-4 w-4 opacity-50 shrink-0' />
								</>
							),
						}}
						options={{
							noOptionsText: 'No customers found',
							emptyText: 'No customers found',
							hideSelectedTick: false,
						}}
					/>
				</div>

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
