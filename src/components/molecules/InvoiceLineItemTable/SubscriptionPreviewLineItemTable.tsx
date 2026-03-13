import { Button, FormHeader, Toggle } from '@/components/atoms';
import { LineItem, INVOICE_TYPE } from '@/models/Invoice';
import { formatBillingPeriod } from '@/utils/common/format_date';
import { getCurrencySymbol } from '@/utils/common/helper_functions';
import { FC, useState } from 'react';
import { RefreshCw } from 'lucide-react';
interface Props {
	data: LineItem[];
	currency?: string;
	total?: number;
	subtotal?: number;
	tax?: number;
	discount?: number;
	amount_due?: number;
	title?: string;
	refetch?: () => void;
	subtitle?: string;
	invoiceType?: INVOICE_TYPE;
}

const formatAmount = (amount: number, currency: string): string => {
	return `${getCurrencySymbol(currency)}${amount}`;
};

const formatPriceType = (value: string): string => {
	switch (value) {
		case 'FIXED':
			return 'Recurring';
		case 'USAGE':
			return 'Usage Based';
		default:
			return 'Unknown';
	}
};

const SubscriptionPreviewLineItemTable: FC<Props> = ({
	data,
	currency,
	title,
	refetch,
	invoiceType,
	subtitle,
	tax,
	discount,
	amount_due,
	subtotal,
}) => {
	const [showZeroCharges, setShowZeroCharges] = useState(false);
	const filteredData = data.filter((item) => showZeroCharges || Number(item.amount) !== 0);

	return (
		<div className='bg-white'>
			<div className='flex justify-between items-center mb-6'>
				<FormHeader
					variant='sub-header'
					className='!mb-0'
					titleClassName='font-semibold text-gray-900'
					subtitleClassName='text-sm text-gray-500 !mb-0 !mt-1'
					title={title}
					subtitle={subtitle}
				/>
				<div className='flex items-center gap-4'>
					{refetch && (
						<Button
							onClick={() => {
								const icon = document.querySelector('.refresh-icon');
								icon?.classList.add('animate-spin');
								refetch();
								icon?.classList.remove('animate-spin');
							}}
							variant='outline'
							size='sm'>
							<RefreshCw className='refresh-icon h-4 w-4' />
						</Button>
					)}
				</div>
			</div>
			<div className='flex items-center gap-4 mb-4'>
				<Toggle checked={showZeroCharges} onChange={() => setShowZeroCharges(!showZeroCharges)} label='Show Zero Charges' />
			</div>

			{/* Line Items Table */}
			<div className='overflow-x-auto mb-8'>
				<table className='w-full border-collapse'>
					<thead>
						<tr className='border-b border-gray-200'>
							<th className='py-3 px-0 text-left text-sm font-medium text-gray-900'>Subscription</th>
							{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
								<th className='py-3 px-4 text-left text-sm font-medium text-gray-900'>Description</th>
							)}
							{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
								<th className='py-3 px-4 text-left text-sm font-medium text-gray-900'>Interval</th>
							)}
							<th className='py-3 px-4 text-center text-sm font-medium text-gray-900'>Quantity</th>
							<th className='py-3 px-0 text-right text-sm font-medium text-gray-900'>Amount</th>
						</tr>
					</thead>
					<tbody>
						{filteredData?.map((item, index) => {
							return (
								<tr key={index} className='border-b border-gray-100'>
									<td className='py-4 px-0 text-sm text-gray-900'>{item.display_name ?? '--'}</td>
									{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
										<td className='py-4 px-4 text-sm text-gray-600'>{item.price_type ? formatPriceType(item.price_type) : '--'}</td>
									)}
									{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
										<td className='py-4 px-4 text-sm text-gray-600'>
											{item.period_start && item.period_end ? formatBillingPeriod(item.period_start, item.period_end) : '--'}
										</td>
									)}
									<td className='py-4 px-4 text-center text-sm text-gray-600'>{item.quantity ? item.quantity : '--'}</td>
									<td className='py-4 px-0 text-right text-sm text-gray-900 '>{formatAmount(item.amount ?? 0, item.currency)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Stripe-style Summary Section */}
			<div className='flex justify-end'>
				<div className='w-80 space-y-2'>
					{/* Subtotal - always show if exists */}
					{subtotal !== undefined && subtotal !== null && Number(subtotal) !== 0 && (
						<div className='flex flex-row justify-end items-center py-1'>
							<div className='w-40 text-right text-base font-medium text-gray-900'>Subtotal</div>
							<div className='flex-1 text-right text-sm text-gray-900 font-medium'>{formatAmount(Number(subtotal), currency ?? '')}</div>
						</div>
					)}

					{/* Discount - only show if provided and > 0 */}
					{discount && Number(discount) > 0 && (
						<div className='flex flex-row justify-end items-center py-1'>
							<div className='w-40 text-right text-base font-medium text-gray-900'>Discount</div>
							<div className='flex-1 text-right text-sm text-gray-900 font-medium'>−{formatAmount(Number(discount), currency ?? '')}</div>
						</div>
					)}
					{/* Tax - only show if provided and > 0 */}
					{tax !== undefined && tax !== null && Number(tax) !== 0 && (
						<div className='flex flex-row justify-end items-center py-1'>
							<div className='w-40 text-right text-base font-medium text-gray-900'>Tax</div>
							<div className='flex-1 text-right text-sm text-gray-900 font-medium'>{formatAmount(Number(tax), currency ?? '')}</div>
						</div>
					)}

					{/* Net payable - always show, default to 0 if not provided */}
					<div className='flex flex-row justify-end border-t border-gray-200 items-center py-3'>
						<div className='w-40 flex items-center gap-2 justify-end text-sm text-gray-900 font-medium'>Net payable</div>
						<div className='flex-1 text-right text-sm text-gray-900 font-semibold'>
							{formatAmount(Number(amount_due ?? 0), currency ?? '')}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SubscriptionPreviewLineItemTable;
