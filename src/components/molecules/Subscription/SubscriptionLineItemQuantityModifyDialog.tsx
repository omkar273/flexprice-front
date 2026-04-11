import { Button, DatePicker, Dialog, Input } from '@/components/atoms';
import type { LineItem } from '@/models/Subscription';
import { useSubscriptionQuantityModify } from '@/hooks/useSubscriptionQuantityModify';
import { buildQuantityChangeModifyRequest } from '@/utils/subscription/buildQuantityChangeModifyRequest';
import type { ExecuteSubscriptionModifyRequest } from '@/types/dto/Subscription';
import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import SubscriptionModifyPreviewSummary from './SubscriptionModifyPreviewSummary';
import formatDate from '@/utils/common/format_date';
import {
	buildEffectiveDateIsoForQuantityModify,
	getDefaultEffectiveDateForQuantityModify,
	getInvoiceCadenceRawFromLineItem,
	isEffectiveDateWithinBillingPeriod,
	isEffectiveDateWithinLineItemWindow,
} from '@/utils/subscription/quantityModifyEffectiveDate';

export interface SubscriptionLineItemQuantityModifyDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	subscriptionId: string;
	lineItem: LineItem;
	/** Subscription billing period bounds (ISO 8601); used to default effective date by invoice cadence. */
	currentPeriodStart: string;
	currentPeriodEnd: string;
}

function isValidPositiveQuantityString(q: string): boolean {
	const t = q.trim().replace(/,/g, '');
	if (!t) return false;
	const n = Number(t);
	return Number.isFinite(n) && n > 0;
}

type Step = 'form' | 'preview';

const SubscriptionLineItemQuantityModifyDialog: FC<SubscriptionLineItemQuantityModifyDialogProps> = ({
	isOpen,
	onOpenChange,
	subscriptionId,
	lineItem,
	currentPeriodStart,
	currentPeriodEnd,
}) => {
	const [step, setStep] = useState<Step>('form');
	const [quantityInput, setQuantityInput] = useState('');
	const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
	const [confirmedPayload, setConfirmedPayload] = useState<ExecuteSubscriptionModifyRequest | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const { preview, execute, previewResult, reset, isPreviewPending, isExecutePending } = useSubscriptionQuantityModify(subscriptionId);

	const invoiceCadenceRaw = getInvoiceCadenceRawFromLineItem(lineItem);

	useEffect(() => {
		if (!isOpen) return;
		setQuantityInput(lineItem.quantity != null ? String(lineItem.quantity) : '');
		setStep('form');
		setEffectiveDate(getDefaultEffectiveDateForQuantityModify(lineItem, currentPeriodStart, currentPeriodEnd));
		setConfirmedPayload(null);
		setFormError(null);
		reset();
	}, [
		isOpen,
		lineItem.id,
		lineItem.quantity,
		lineItem.start_date,
		lineItem.end_date,
		invoiceCadenceRaw,
		currentPeriodStart,
		currentPeriodEnd,
		reset,
	]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			reset();
			setStep('form');
			setEffectiveDate(undefined);
			setConfirmedPayload(null);
			setFormError(null);
		}
		onOpenChange(open);
	};

	const buildPayloadFromForm = useCallback((): ExecuteSubscriptionModifyRequest | null => {
		if (!isValidPositiveQuantityString(quantityInput)) {
			setFormError('Enter a valid quantity greater than zero.');
			return null;
		}
		if (effectiveDate && !isEffectiveDateWithinLineItemWindow(lineItem, effectiveDate)) {
			const startHint = lineItem.start_date?.trim() ? ` This charge started on ${formatDate(lineItem.start_date)}.` : '';
			setFormError(`Set the effective date to a time when this charge is active.${startHint}`);
			return null;
		}
		if (effectiveDate && !isEffectiveDateWithinBillingPeriod(currentPeriodStart, currentPeriodEnd, effectiveDate)) {
			setFormError(
				'Set the effective date within the current billing period. The period end is exclusive — choose a time before it, or clear the field for immediate effect.',
			);
			return null;
		}
		setFormError(null);
		const effectiveIso = effectiveDate ? buildEffectiveDateIsoForQuantityModify(lineItem, effectiveDate, currentPeriodEnd) : undefined;
		return buildQuantityChangeModifyRequest({
			lineItemId: lineItem.id,
			quantity: quantityInput.trim().replace(/,/g, ''),
			effectiveDateIso: effectiveIso,
		});
	}, [quantityInput, effectiveDate, lineItem, currentPeriodStart, currentPeriodEnd]);

	const handlePreview = async () => {
		const payload = buildPayloadFromForm();
		if (!payload) return;
		try {
			await preview(payload);
			setConfirmedPayload(payload);
			setStep('preview');
		} catch {
			// Error surfaced via toast in hook
		}
	};

	const handleBack = () => {
		setStep('form');
		setConfirmedPayload(null);
		reset();
	};

	const handleApply = async () => {
		if (!confirmedPayload) return;
		try {
			await execute(confirmedPayload);
			handleOpenChange(false);
		} catch {
			// Error surfaced via toast in hook
		}
	};

	const busy = isPreviewPending || isExecutePending;

	return (
		<Dialog
			isOpen={isOpen}
			onOpenChange={handleOpenChange}
			title={step === 'form' ? 'Change quantity' : 'Review changes'}
			description={
				step === 'form' ? (
					<span className='text-sm text-gray-600'>
						Update quantity for <span className='font-medium text-gray-900'>{lineItem.display_name}</span>. Preview proration effects before
						applying.
					</span>
				) : undefined
			}
			className='sm:max-w-[560px]'
			showCloseButton={!busy}>
			<div className={step === 'preview' ? 'space-y-4' : 'space-y-6'}>
				{step === 'form' && (
					<>
						<div className='space-y-2'>
							<Input
								label='Quantity'
								variant='text'
								value={quantityInput}
								onChange={(e) => setQuantityInput(e)}
								placeholder='e.g. 10'
								disabled={busy}
							/>
							{formError && <p className='text-sm text-red-600'>{formError}</p>}
						</div>
						<div className='space-y-2'>
							<DatePicker
								label='Effective date'
								placeholder='Select date'
								date={effectiveDate}
								setDate={setEffectiveDate}
								popoverTriggerClassName='w-full'
								className='w-full'
								disabled={busy}
							/>
							<p className='text-xs text-gray-500'>
								Defaults to period start (arrear) or the last moment inside the current period (advance; period end is exclusive). Adjusted
								so the charge is already active. Clear the date for immediate effect.
							</p>
						</div>
						<div className='flex justify-end gap-3 pt-2'>
							<Button variant='outline' onClick={() => handleOpenChange(false)} disabled={busy}>
								Cancel
							</Button>
							<Button onClick={() => void handlePreview()} isLoading={isPreviewPending} disabled={busy}>
								Preview
							</Button>
						</div>
					</>
				)}

				{step === 'preview' && (
					<>
						<SubscriptionModifyPreviewSummary
							data={previewResult}
							quantityChangeContext={{
								lineItemDisplayName: lineItem.display_name,
								previousQuantity: lineItem.quantity != null ? String(lineItem.quantity) : '',
								newQuantity: quantityInput.trim().replace(/,/g, '') || (lineItem.quantity != null ? String(lineItem.quantity) : ''),
								currency: lineItem.currency || 'USD',
							}}
						/>
						<div className='flex justify-end gap-3 border-t border-gray-100 pt-4'>
							<Button variant='outline' onClick={handleBack} disabled={busy}>
								Back
							</Button>
							<Button onClick={() => void handleApply()} isLoading={isExecutePending} disabled={busy || !confirmedPayload}>
								Apply changes
							</Button>
						</div>
					</>
				)}
			</div>
		</Dialog>
	);
};

export default SubscriptionLineItemQuantityModifyDialog;
