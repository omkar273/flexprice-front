import { Button, FormHeader, Toggle } from '@/components/atoms';
import { LineItem, INVOICE_TYPE } from '@/models/Invoice';
import { getCurrencySymbol } from '@/utils/common/helper_functions';
import { formatBillingPeriod } from '@/utils/common/format_date';
import { FC, useState } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PRICE_TYPE } from '@/models';

interface Props {
	data: LineItem[];
	currency?: string;
	amount_due?: number;
	total?: number;
	subtotal?: number;
	total_prepaid_credits_applied?: number;
	total_tax?: number;
	discount?: number;
	amount_paid?: number;
	amount_remaining?: number;
	title?: string;
	refetch?: () => void;
	subtitle?: string;
	invoiceType?: INVOICE_TYPE;
}

const formatAmount = (amount: number, currency: string): string => {
	return `${getCurrencySymbol(currency)}${amount}`;
};

const formatPriceType = (value: PRICE_TYPE): string => {
	switch (value) {
		case PRICE_TYPE.FIXED:
			return 'Recurring';
		case PRICE_TYPE.USAGE:
			return 'Usage Based';
		default:
			return 'Unknown';
	}
};

const InvoiceLineItemTable: FC<Props> = ({
	data,
	amount_due,
	currency,
	title,
	refetch,
	invoiceType,
	subtitle,
	discount,
	total_tax,
	amount_paid,
	amount_remaining,
	subtotal,
	total_prepaid_credits_applied,
}) => {
	const [showZeroCharges, setShowZeroCharges] = useState(false);
	const filteredData = data.filter((item) => showZeroCharges || Number(item.amount) !== 0);

	return (
		<div className='bg-white'>
			<div className='w-full p-6'>
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
						<Toggle checked={showZeroCharges} onChange={() => setShowZeroCharges(!showZeroCharges)} label='Show Zero Charges' />
					</div>
				</div>

				{/* Line Items Table */}
				<div className='overflow-x-auto mb-8'>
					<table className='w-full border-collapse'>
						<thead>
							<tr className='border-b border-gray-200'>
								<th className='py-3 px-0 text-left text-sm font-medium text-gray-900'>Subscription</th>
								{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
									<th className='py-3 px-4 text-right text-sm font-medium text-gray-900'>Description</th>
								)}
								{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
									<th className='py-3 px-4 text-right text-sm font-medium text-gray-900'>Interval</th>
								)}
								<th className='py-3 px-4 text-right text-sm font-medium text-gray-900'>Quantity</th>
								<th className='py-3 px-0 text-right text-sm w-36 font-medium text-gray-900'>Amount</th>
							</tr>
						</thead>
						<tbody>
							{filteredData?.map((item, index) => {
								return (
									<tr key={index} className='border-b border-gray-100'>
										<td className='py-4 px-0 text-sm  text-gray-900'>{item.display_name ?? '--'}</td>
										{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
											<td className='py-4 px-4 text-sm text-gray-600 text-right'>
												{item.price_type ? formatPriceType(item.price_type) : '--'}
											</td>
										)}
										{invoiceType === INVOICE_TYPE.SUBSCRIPTION && (
											<td className='py-4 px-4 text-sm text-gray-600 text-right'>
												{item.period_start && item.period_end ? formatBillingPeriod(item.period_start, item.period_end) : '--'}
											</td>
										)}
										<td className='py-4 px-4 text-right text-sm text-gray-600'>{item.quantity ? item.quantity : '--'}</td>
										<td className='py-4 px-0 text-right w-36  text-sm text-gray-600'>{formatAmount(item.amount ?? 0, item.currency)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Summary Section */}
				<div className='flex justify-end'>
					<div className='w-72 space-y-1'>
						{/* Subtotal - always show if exists */}
						{subtotal !== undefined && subtotal !== null && Number(subtotal) !== 0 && (
							<div className='flex justify-between items-center py-1.5'>
								<span className='text-xs text-gray-500'>Subtotal</span>
								<span className='text-sm text-gray-900 font-medium'>{formatAmount(Number(subtotal), currency ?? '')}</span>
							</div>
						)}

						{/* Discount - only show if provided and > 0 */}
						{discount !== undefined && discount !== null && Number(discount) > 0 && (
							<div className='flex justify-between items-center py-1.5'>
								<span className='text-xs text-gray-500'>Discount</span>
								<span className='text-sm text-gray-600'>−{formatAmount(Number(discount), currency ?? '')}</span>
							</div>
						)}

						{/* Prepaid Credits Applied - only show if provided and > 0 */}
						{total_prepaid_credits_applied !== undefined &&
							total_prepaid_credits_applied !== null &&
							Number(total_prepaid_credits_applied) > 0 && (
								<div className='flex justify-between items-center py-1.5'>
									<span className='text-xs text-gray-500'>Prepaid Credits</span>
									<span className='text-sm text-gray-600'>−{formatAmount(Number(total_prepaid_credits_applied), currency ?? '')}</span>
								</div>
							)}

						{total_tax !== undefined && total_tax !== null && Number(total_tax) !== 0 && (
							<div className='flex justify-between items-center py-1.5'>
								<span className='text-xs text-gray-500'>Tax</span>
								<span className='text-sm text-gray-900 font-medium'>{formatAmount(Number(total_tax), currency ?? '')}</span>
							</div>
						)}

						{/* Net payable - always show, default to 0 if not provided */}
						<div className='flex justify-between items-center pt-3 mt-2 border-t border-gray-100'>
							<div className='flex items-center gap-1.5'>
								<span className='text-sm text-gray-900 font-semibold'>Net payable</span>
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info className='h-3.5 w-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-help' />
										</TooltipTrigger>
										<TooltipContent sideOffset={5} className='bg-gray-900 text-xs text-white px-2.5 py-1.5 rounded-[6px] max-w-[200px]'>
											Final amount due after applying credit notes
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<span className='text-base text-gray-900 font-semibold'>{formatAmount(Number(amount_due ?? 0), currency ?? '')}</span>
						</div>

						{/* Amount paid - always show, default to 0 if not provided */}
						<div className='flex justify-between items-center py-1.5'>
							<span className='text-xs text-gray-500'>Amount paid</span>
							<span className='text-sm text-gray-900 font-medium'>{formatAmount(Number(amount_paid ?? 0), currency ?? '')}</span>
						</div>

						{/* Remaining balance - show the final outstanding amount */}
						{((amount_remaining !== undefined && amount_remaining !== null && Number(amount_remaining) > 0) ||
							(amount_due !== undefined && amount_due !== null && Number(amount_due) > 0)) && (
							<div className='flex justify-between items-center pt-3 mt-2 border-t border-gray-100'>
								<span className='text-sm text-gray-900 font-semibold'>Remaining balance</span>
								<span className='text-base text-gray-900 font-semibold'>
									{formatAmount(Number(amount_remaining ?? amount_due ?? 0), currency ?? '')}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default InvoiceLineItemTable;
