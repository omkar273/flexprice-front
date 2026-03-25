import {
	Subscription,
	SUBSCRIPTION_PRORATION_BEHAVIOR,
	SUBSCRIPTION_CANCELLATION_TYPE,
	SUBSCRIPTION_CANCEL_IMMEDIATELY_INVOICE_POLICY,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TYPE,
} from '@/models/Subscription';
import { useMutation } from '@tanstack/react-query';
import { CirclePause, CirclePlay, X, Plus, Pencil, Play } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import SubscriptionApi from '@/api/SubscriptionApi';
import { DatePicker, Label, Modal, Input, Button, FormHeader, Spacer, Select, Toggle } from '@/components/atoms';
import { toast } from 'react-hot-toast';
import DropdownMenu, { DropdownMenuOption } from '@/components/molecules/DropdownMenu/DropdownMenu';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { addDays, format } from 'date-fns';
import { useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import { ServerError } from '@/core/axios/types';

interface Props {
	subscription: Subscription;
}

const SubscriptionActionButton: React.FC<Props> = ({ subscription }) => {
	const navigate = useNavigate();
	const [state, setState] = useState({
		isPauseModalOpen: false,
		isResumeModalOpen: false,
		isCancelModalOpen: false,
		isAddPhaseModalOpen: false,
		isActivateModalOpen: false,
		pauseStartDate: new Date(),
		pauseDays: '',
		pauseReason: '',
		activateStartDate: new Date(),
		cancelCancellationType: SUBSCRIPTION_CANCELLATION_TYPE.IMMEDIATE,
		cancelProrationBehavior: SUBSCRIPTION_PRORATION_BEHAVIOR.NONE,
		cancelGenerateInvoice: false,
		cancelReason: '',
		cancelScheduledAt: undefined as Date | undefined,
	});

	const resetCancelState = () => {
		setState((prev) => ({
			...prev,
			isCancelModalOpen: false,
			cancelCancellationType: SUBSCRIPTION_CANCELLATION_TYPE.IMMEDIATE,
			cancelProrationBehavior: SUBSCRIPTION_PRORATION_BEHAVIOR.NONE,
			cancelGenerateInvoice: false,
			cancelReason: '',
			cancelScheduledAt: undefined,
		}));
	};

	const getCancelImmediatelyInvoicePolicy = () =>
		state.cancelGenerateInvoice
			? SUBSCRIPTION_CANCEL_IMMEDIATELY_INVOICE_POLICY.GENERATE_INVOICE
			: SUBSCRIPTION_CANCEL_IMMEDIATELY_INVOICE_POLICY.SKIP;

	const pauseEndDate = useMemo(() => {
		if (!state.pauseDays) return null;
		return addDays(state.pauseStartDate, parseInt(state.pauseDays));
	}, [state.pauseStartDate, state.pauseDays]);

	const minCancelScheduledAt = useMemo(() => new Date(), []);

	const { mutate: pauseSubscription, isPending: isPauseLoading } = useMutation({
		mutationFn: (id: string) =>
			SubscriptionApi.pauseSubscription(id, {
				pause_start: state.pauseStartDate.toISOString(),
				pause_days: parseInt(state.pauseDays),
				pause_mode: 'immediate',
			}),
		onSuccess: async () => {
			setState((prev) => ({ ...prev, isPauseModalOpen: false }));
			toast.success('Subscription paused successfully');
			await refetchQueries(['subscriptionDetails']);
			await refetchQueries(['subscriptions']);
		},
		onError: (error: ServerError) => {
			setState((prev) => ({ ...prev, isPauseModalOpen: false }));
			toast.error(error.error.message || 'Failed to pause subscription');
		},
	});

	const { mutate: resumeSubscription, isPending: isResumeLoading } = useMutation({
		mutationFn: (id: string) =>
			SubscriptionApi.resumeSubscription(id, {
				resume_mode: 'immediate',
			}),
		onSuccess: async () => {
			setState((prev) => ({ ...prev, isResumeModalOpen: false }));
			toast.success('Subscription resumed successfully');
			await refetchQueries(['subscriptionDetails']);
			await refetchQueries(['subscriptions']);
		},
		onError: (err: ServerError) => {
			setState((prev) => ({ ...prev, isResumeModalOpen: false }));
			toast.error(err.error.message || 'Failed to resume subscription');
		},
	});

	const cancelScheduledInvalid =
		state.cancelCancellationType === SUBSCRIPTION_CANCELLATION_TYPE.SCHEDULED_DATE && state.cancelScheduledAt === undefined;

	const { mutate: cancelSubscription, isPending: isCancelLoading } = useMutation({
		mutationFn: (id: string) =>
			SubscriptionApi.cancelSubscription(id, {
				proration_behavior: state.cancelProrationBehavior,
				cancellation_type: state.cancelCancellationType,
				cancel_immediately_inovice_policy: getCancelImmediatelyInvoicePolicy(),
				...(state.cancelReason.trim() ? { reason: state.cancelReason.trim() } : {}),
				...(state.cancelCancellationType === SUBSCRIPTION_CANCELLATION_TYPE.SCHEDULED_DATE && state.cancelScheduledAt
					? { cancel_at: state.cancelScheduledAt.toISOString() }
					: {}),
			}),
		onSuccess: async () => {
			resetCancelState();
			toast.success('Subscription cancelled successfully');
			await refetchQueries(['subscriptionDetails']);
			await refetchQueries(['subscriptions']);
		},
		onError: (err: ServerError) => {
			resetCancelState();
			toast.error(err.error.message || 'Failed to cancel subscription');
		},
	});

	const { mutate: activateSubscription, isPending: isActivating } = useMutation({
		mutationFn: (id: string) =>
			SubscriptionApi.activateSubscription(id, {
				start_date: state.activateStartDate.toISOString(),
			}),
		onSuccess: async () => {
			setState((prev) => ({ ...prev, isActivateModalOpen: false }));
			toast.success('Subscription activated successfully');
			await refetchQueries(['subscriptionDetails']);
			await refetchQueries(['subscriptions']);
			await refetchQueries(['subscriptionInvoices']);
		},
		onError: (error: ServerError) => {
			toast.error(error.error.message || 'Failed to activate subscription');
		},
	});

	const isPaused = subscription.subscription_status.toUpperCase() === 'PAUSED';
	const isCancelled = subscription.subscription_status.toUpperCase() === 'CANCELLED';
	const isInherited = subscription.subscription_type === SUBSCRIPTION_TYPE.INHERITED;
	const isDraft = subscription.subscription_status === SUBSCRIPTION_STATUS.DRAFT;

	const menuOptions: DropdownMenuOption[] = [
		...(isDraft
			? [
					{
						label: 'Activate Subscription',
						icon: <Play className='h-4 w-4' />,
						onSelect: () => setState((prev) => ({ ...prev, isActivateModalOpen: true })),
					},
				]
			: []),
		{
			label: 'Edit Subscription',
			icon: <Pencil className='h-4 w-4' />,
			onSelect: () => navigate(`${RouteNames.subscriptions}/${subscription.id}/edit`),
			disabled: isCancelled,
		},
		...(!isPaused && !isCancelled && !isDraft
			? [
					{
						label: 'Pause Subscription',
						icon: <CirclePause className='h-4 w-4' />,
						onSelect: () => setState((prev) => ({ ...prev, isPauseModalOpen: true })),
						disabled: isPaused || isCancelled,
					},
					{
						label: 'Add Subscription Phase',
						icon: <Plus className='h-4 w-4' />,
						onSelect: () => setState((prev) => ({ ...prev, isAddPhaseModalOpen: true })),
						disabled: isPaused || isCancelled,
					},
				]
			: []),
		...(isPaused && !isCancelled
			? [
					{
						label: 'Resume Subscription',
						icon: <CirclePlay className='h-4 w-4' />,
						onSelect: () => setState((prev) => ({ ...prev, isResumeModalOpen: true })),
						disabled: isCancelled,
					},
				]
			: []),
		{
			label: 'Cancel Subscription',
			icon: <X className='h-4 w-4' />,
			onSelect: () => setState((prev) => ({ ...prev, isCancelModalOpen: true })),
			disabled: isCancelled || isInherited,
			className: 'text-destructive',
		},
	];

	return (
		<>
			<DropdownMenu options={menuOptions} />

			{/* Pause Modal */}
			<Modal
				isOpen={state.isPauseModalOpen}
				onOpenChange={(open) => setState((prev) => ({ ...prev, isPauseModalOpen: open }))}
				className='bg-white rounded-lg p-6 w-[560px] max-w-[90vw]'>
				<div className=''>
					<FormHeader
						title='Pause Subscription'
						variant='sub-header'
						subtitle='Pausing the subscription will stop the subscription from charging the customer for the selected period.'
					/>
					<Spacer className='!my-6' />
					<div className='flex gap-4 w-full items-end'>
						<DatePicker
							label='Pause Start Date'
							date={state.pauseStartDate}
							setDate={(date) => setState((prev) => ({ ...prev, pauseStartDate: date || new Date() }))}
							minDate={new Date()}
							className='!w-full '
						/>

						<Input
							label='Number of days'
							value={state.pauseDays}
							onChange={(value) => setState((prev) => ({ ...prev, pauseDays: value }))}
							suffix='days'
							placeholder='Enter number of days'
							variant='integer'
							className='!h-10'
							labelClassName='!text-muted-foreground font-normal mb-0'
						/>
					</div>

					{state.pauseDays && pauseEndDate && (
						<p className='text-sm text-muted-foreground  mt-4'>
							The subscription of <span className='text-black'>{subscription.customer?.name}</span> to{' '}
							<span className='text-black'>{subscription.plan?.name}</span> will be paused from{' '}
							<span className='text-black'>{format(state.pauseStartDate, 'do MMM')}</span> to{' '}
							<span className='text-black'>{format(pauseEndDate, 'do MMM')}</span>. The subscription will resume from{' '}
							<span className='text-black'>{format(addDays(pauseEndDate, 1), 'do MMM')}</span> and the customer will not be charged until{' '}
							<span className='text-black'>{format(pauseEndDate, 'do MMM')}</span>.
						</p>
					)}

					<div className='flex justify-end gap-3 pt-4'>
						<Button
							variant='outline'
							onClick={() => setState((prev) => ({ ...prev, isPauseModalOpen: false }))}
							disabled={isPauseLoading}
							className='px-6'>
							Cancel
						</Button>
						<Button onClick={() => pauseSubscription(subscription.id)} disabled={isPauseLoading || !state.pauseDays} className='px-6'>
							{isPauseLoading ? 'Pausing...' : 'Schedule Pause'}
						</Button>
					</div>
				</div>
			</Modal>

			{/* Resume Modal */}
			<Modal
				isOpen={state.isResumeModalOpen}
				onOpenChange={(open) => setState((prev) => ({ ...prev, isResumeModalOpen: open }))}
				className='bg-white rounded-lg p-6 w-[800px] max-w-[90vw]'>
				<div className='space-y-4'>
					<FormHeader title='Resume Subscription' variant='sub-header' />
					<Spacer className='!my-6' />
					<p className='text-sm text-muted-foreground  mt-4'>
						{`Resuming the subscription will start a new billing cycle from ${format(new Date(), 'do MMM')} and generate a new invoice. Customers using advance charging will be charged immediately.`}
					</p>
					<div className='flex justify-end gap-3 pt-4'>
						<Button
							variant='outline'
							onClick={() => setState((prev) => ({ ...prev, isResumeModalOpen: false }))}
							disabled={isResumeLoading}>
							Cancel
						</Button>
						<Button onClick={() => resumeSubscription(subscription.id)} disabled={isResumeLoading}>
							{isResumeLoading ? 'Resuming...' : 'Yes, Resume'}
						</Button>
					</div>
				</div>
			</Modal>

			{/* Cancel Modal */}
			<Modal
				isOpen={state.isCancelModalOpen}
				onOpenChange={(open) => {
					if (!open) {
						resetCancelState();
						return;
					}
					setState((prev) => ({ ...prev, isCancelModalOpen: open }));
				}}
				className='card bg-white w-[560px] max-w-[90vw]'>
				<div className='space-y-4'>
					<FormHeader
						title='Cancel Subscription'
						variant='sub-header'
						subtitle='This action cannot be undone. Choose cancellation and invoice behavior before continuing.'
						titleClassName='!mb-1'
						subtitleClassName='!text-sm !max-w-[440px] !leading-6'
					/>
					<div className='space-y-4'>
						<Select
							label='Cancellation Type'
							value={state.cancelCancellationType}
							options={[
								{ label: 'Immediate', value: SUBSCRIPTION_CANCELLATION_TYPE.IMMEDIATE },
								{ label: 'End of period', value: SUBSCRIPTION_CANCELLATION_TYPE.END_OF_PERIOD },
								{ label: 'Scheduled date', value: SUBSCRIPTION_CANCELLATION_TYPE.SCHEDULED_DATE },
							]}
							onChange={(value) => {
								const next = value as SUBSCRIPTION_CANCELLATION_TYPE;
								setState((prev) => ({
									...prev,
									cancelCancellationType: next,
									...(next !== SUBSCRIPTION_CANCELLATION_TYPE.SCHEDULED_DATE ? { cancelScheduledAt: undefined } : {}),
								}));
							}}
						/>
						{state.cancelCancellationType === SUBSCRIPTION_CANCELLATION_TYPE.SCHEDULED_DATE && (
							<div className='space-y-1 w-full'>
								<Label label='Cancel on' />
								<DatePicker
									date={state.cancelScheduledAt}
									setDate={(date) => setState((prev) => ({ ...prev, cancelScheduledAt: date }))}
									className='!w-full'
									popoverClassName='!w-full'
									popoverTriggerClassName='!w-full'
									popoverContentClassName='!w-full'
									placeholder='Select cancellation date'
									minDate={minCancelScheduledAt}
								/>
							</div>
						)}
						<Select
							label='Proration Behavior'
							value={state.cancelProrationBehavior}
							options={[
								{ label: 'None', value: SUBSCRIPTION_PRORATION_BEHAVIOR.NONE },
								{ label: 'Create prorations', value: SUBSCRIPTION_PRORATION_BEHAVIOR.CREATE_PRORATIONS },
							]}
							onChange={(value) =>
								setState((prev) => ({
									...prev,
									cancelProrationBehavior: value as SUBSCRIPTION_PRORATION_BEHAVIOR,
								}))
							}
						/>
						<Toggle
							title='Invoice behavior'
							label='Generate invoice'
							description='Enable to generate an invoice for usage till the cancellation date.'
							checked={state.cancelGenerateInvoice}
							onChange={(checked) => setState((prev) => ({ ...prev, cancelGenerateInvoice: checked }))}
						/>
						<Input
							label='Reason (optional)'
							value={state.cancelReason}
							onChange={(value) => setState((prev) => ({ ...prev, cancelReason: value }))}
							placeholder='Why is this subscription being cancelled?'
						/>
					</div>
					<div className='flex justify-end gap-3 pt-4'>
						<Button variant='outline' onClick={() => resetCancelState()} disabled={isCancelLoading}>
							No, Keep It
						</Button>
						<Button
							variant='destructive'
							onClick={() => cancelSubscription(subscription.id)}
							disabled={isCancelLoading || cancelScheduledInvalid}>
							{isCancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
						</Button>
					</div>
				</div>
			</Modal>

			{/* Activate Modal */}
			<Modal
				isOpen={state.isActivateModalOpen}
				onOpenChange={(open) => setState((prev) => ({ ...prev, isActivateModalOpen: open }))}
				className='bg-white rounded-lg p-6 w-[560px] max-w-[90vw]'>
				<div className=''>
					<FormHeader
						title='Activate Subscription'
						variant='sub-header'
						subtitle='Activating the subscription will start the billing cycle from the selected start date.'
					/>
					<Spacer className='!my-6' />
					<div className='w-full'>
						<DatePicker
							label='Start Date'
							date={state.activateStartDate}
							setDate={(date) => setState((prev) => ({ ...prev, activateStartDate: date || new Date() }))}
							className='!w-full'
						/>
					</div>

					<div className='flex justify-end gap-3 pt-4'>
						<Button
							variant='outline'
							onClick={() => setState((prev) => ({ ...prev, isActivateModalOpen: false }))}
							disabled={isActivating}
							className='px-6'>
							Cancel
						</Button>
						<Button
							onClick={() => activateSubscription(subscription.id)}
							disabled={isActivating || !state.activateStartDate}
							className='px-6'>
							{isActivating ? 'Activating...' : 'Activate'}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};

export default SubscriptionActionButton;
