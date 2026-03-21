import { FC, useMemo, useState } from 'react';
import FlexpriceTable, { ColumnData } from '../Table';
import { AddButton, Button, Dialog, FormHeader } from '@/components/atoms';
import { Select } from '@/components/atoms';
import { Trash2 } from 'lucide-react';
import type { Customer } from '@/models';

interface Props {
	/** Subscription customer (shown as "Self" in add list and table) */
	customer: Customer;
	childCustomers: Customer[];
	value: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
}

interface TableRow {
	id: string;
	name: string;
	external_id: string;
}

const UsageCustomersTable: FC<Props> = ({ customer, childCustomers, value, onChange, disabled }) => {
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string>('');

	const customerId = customer.id;
	const customerDisplayName = customer.name || customer.external_id || 'Self';
	const customerExternalId = customer.external_id;

	const idToLabel = useMemo(() => {
		const map: Record<string, string> = {
			[customerId]: customerDisplayName,
		};
		childCustomers.forEach((c) => {
			map[c.id] = c.name || c.external_id || c.id;
		});
		return map;
	}, [customerId, customerDisplayName, childCustomers]);

	const idToName = useMemo(() => {
		const map: Record<string, string> = {
			[customerId]: customerDisplayName,
		};
		childCustomers.forEach((c) => {
			map[c.id] = c.name || c.external_id || c.id;
		});
		return map;
	}, [customerId, customerDisplayName, childCustomers]);

	const idToExternalId = useMemo(() => {
		const map: Record<string, string> = {
			[customerId]: customerExternalId ?? '--',
		};
		childCustomers.forEach((c) => {
			map[c.id] = c.external_id ?? '--';
		});
		return map;
	}, [customerId, customerExternalId, childCustomers]);

	const tableData: TableRow[] = useMemo(
		() =>
			value.map((id) => ({
				id,
				name: idToName[id] ?? id,
				external_id: idToExternalId[id] ?? '--',
			})),
		[value, idToName, idToExternalId],
	);

	const addOptions = useMemo(() => {
		const selfOption = { value: customerId, label: idToLabel[customerId] ?? 'Self' };
		const childOptions = childCustomers.map((c) => ({
			value: c.id,
			label: idToLabel[c.id] ?? c.id,
		}));
		const all = [selfOption, ...childOptions];
		return all.filter((opt) => !value.includes(opt.value));
	}, [customerId, idToLabel, childCustomers, value]);

	const handleAdd = () => {
		if (selectedId) {
			onChange([...value, selectedId]);
			setSelectedId('');
			setIsAddOpen(false);
		}
	};

	const handleRemove = (id: string) => {
		onChange(value.filter((x) => x !== id));
	};

	const columns: ColumnData<TableRow>[] = [
		{ title: 'Name', render: (row) => row.name },
		{ title: 'External ID', render: (row) => row.external_id },
		{
			title: '',
			fieldVariant: 'interactive',
			hideOnEmpty: true,
			width: '80px',
			render: (row) => (
				<Button
					variant='ghost'
					size='icon'
					disabled={disabled}
					onClick={(e) => {
						e.stopPropagation();
						handleRemove(row.id);
					}}
					className='text-muted-foreground hover:text-destructive'
					aria-label={`Remove ${row.name}`}>
					<Trash2 className='w-4 h-4' />
				</Button>
			),
		},
	];

	return (
		<div>
			<Dialog
				isOpen={isAddOpen}
				onOpenChange={(open) => {
					setIsAddOpen(open);
					if (!open) setSelectedId('');
				}}
				title='Add usage customer'
				description='Select a customer whose usage will be aggregated for this subscription.'>
				<div className='space-y-4'>
					<Select
						label='Customer'
						placeholder='Select customer'
						options={addOptions}
						value={selectedId}
						onChange={setSelectedId}
						noOptionsText='All customers have been added'
					/>
					<div className='flex justify-end gap-2'>
						<Button variant='outline' onClick={() => setIsAddOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleAdd} disabled={!selectedId}>
							Add
						</Button>
					</div>
				</div>
			</Dialog>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<FormHeader className='mb-0' title='Usage customers' variant='sub-header' />
					<AddButton onClick={() => setIsAddOpen(true)} disabled={disabled || addOptions.length === 0} />
				</div>
				<div className='rounded-[6px] border border-gray-300'>
					<FlexpriceTable data={tableData} columns={columns} showEmptyRow />
				</div>
			</div>
		</div>
	);
};

export default UsageCustomersTable;
