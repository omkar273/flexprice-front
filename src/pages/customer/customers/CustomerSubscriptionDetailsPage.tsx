import { Card, FormHeader, Page, Spacer, Chip } from '@/components/atoms';
import { SubscriptionPauseWarning, UpcomingCreditGrantApplicationsTable } from '@/components/molecules';
import { SubscriptionPreviewLineItemTable } from '@/components/molecules/InvoiceLineItemTable';
import SubscriptionActionButton from '@/components/organisms/Subscription/SubscriptionActionButton';
import { getSubscriptionStatus } from '@/components/organisms/Subscription/SubscriptionTable';
import { Skeleton } from '@/components/ui';
import { RouteNames } from '@/core/routes/Routes';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import { CustomerApi, SubscriptionApi, TaxApi } from '@/api';
import { formatDateShort, getCurrencySymbol } from '@/utils/common/helper_functions';
import { useQuery } from '@tanstack/react-query';
import { FC, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, Link } from 'react-router';
import { INVOICE_TYPE } from '@/models/Invoice';
import { TAXRATE_ENTITY_TYPE } from '@/models/Tax';
import TaxAssociationTable from '@/components/molecules/TaxAssociationTable';
import { SUBSCRIPTION_STATUS } from '@/models/Subscription';
import { Subscription as SubscriptionType } from '@/models/Subscription';
import { BILLING_PERIOD } from '@/constants/constants';
import { ExternalLink } from 'lucide-react';

function getCommitmentPeriodLabel(subscription: SubscriptionType | undefined): string {
	const period = subscription?.commitment_duration;
	const count = subscription?.billing_period_count ?? 1;

	if (!period) return '--';

	switch (period) {
		case BILLING_PERIOD.ANNUAL:
			return 'Annual';
		case BILLING_PERIOD.MONTHLY:
			if (count === 12) return 'Annual';
			if (count === 1) return 'Monthly';
			return `${count} months`;
		case BILLING_PERIOD.QUARTERLY:
			return 'Quarterly';
		case BILLING_PERIOD.HALF_YEARLY:
			return 'Half-Yearly';
		case BILLING_PERIOD.WEEKLY:
			return 'Weekly';
		case BILLING_PERIOD.DAILY:
			return 'Daily';
		default:
			return '--';
	}
}

const CustomerSubscriptionDetailsPage: FC = () => {
	const { subscription_id, id: customerId } = useParams();
	const { updateBreadcrumb } = useBreadcrumbsStore();
	const { data: subscriptionDetails, isLoading: isSubscriptionDetailsLoading } = useQuery<SubscriptionType>({
		queryKey: ['subscriptionDetails', subscription_id],
		queryFn: async (): Promise<SubscriptionType> => {
			// Use v2 API with minimal expand - only request fields needed for this page
			return await SubscriptionApi.getSubscriptionV2(subscription_id!, { expand: 'plan' });
		},
		staleTime: 1,
	});

	const { data: customer } = useQuery({
		queryKey: ['fetchCustomerDetails', customerId],
		queryFn: async () => await CustomerApi.getCustomerById(customerId!),
		enabled: !!customerId,
	});

	// Fetch invoicing customer if different from subscription customer
	const { data: invoicingCustomer } = useQuery({
		queryKey: ['invoicingCustomer', subscriptionDetails?.invoicing_customer_id],
		queryFn: async () => {
			if (!subscriptionDetails?.invoicing_customer_id) return null;
			return await CustomerApi.getCustomerById(subscriptionDetails.invoicing_customer_id);
		},
		enabled: !!subscriptionDetails?.invoicing_customer_id && subscriptionDetails.invoicing_customer_id !== subscriptionDetails?.customer_id,
	});

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['subscriptionInvoices', subscription_id],
		queryFn: async () => {
			return await SubscriptionApi.getSubscriptionInvoicesPreview({ subscription_id: subscription_id! });
		},
		enabled:
			!!subscriptionDetails &&
			subscriptionDetails.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED &&
			subscriptionDetails.subscription_status !== SUBSCRIPTION_STATUS.TRIALING &&
			subscriptionDetails.subscription_status !== SUBSCRIPTION_STATUS.DRAFT &&
			!!subscription_id,
	});

	const { data: subscriptionTaxAssociations } = useQuery({
		queryKey: ['subscriptionTaxAssociations', subscription_id],
		queryFn: async () => {
			return await TaxApi.listTaxAssociations({
				limit: 100,
				offset: 0,
				entity_id: subscription_id!,
				entity_type: TAXRATE_ENTITY_TYPE.SUBSCRIPTION,
			});
		},
		enabled: !!subscription_id,
	});

	const { data: upcomingCreditGrantApplications } = useQuery({
		queryKey: ['upcomingCreditGrantApplications', subscription_id],
		queryFn: async () => {
			return await SubscriptionApi.getUpcomingCreditGrantApplications(subscription_id!);
		},
		enabled: !!subscription_id,
	});

	useEffect(() => {
		if (subscriptionDetails?.plan?.name) {
			updateBreadcrumb(4, subscriptionDetails.plan.name);
		}

		updateBreadcrumb(3, 'Subscription', RouteNames.customers + '/' + customerId);

		if (customer?.external_id) {
			updateBreadcrumb(2, customer.external_id);
		}
	}, [subscriptionDetails, updateBreadcrumb, customer, customerId]);

	if (isLoading || isSubscriptionDetailsLoading) {
		return (
			<Page>
				<Skeleton className='h-48' />
				<Spacer className='!my-4' />
				<Skeleton className='h-60' />
			</Page>
		);
	}

	if (isError) {
		toast.error('Something went wrong');
	}

	const isPaused = subscriptionDetails?.subscription_status.toUpperCase() === 'PAUSED';
	const activePauseDetails = subscriptionDetails?.pauses?.find((pause) => pause.id === subscriptionDetails.active_pause_id);
	// Determine if subscription is scheduled to cancel soon (within 15 days)
	const getCancellationEffectiveDate = (): Date | null => {
		if (!subscriptionDetails) return null;
		// If cancel_at is set, that is the effective cancellation date
		if (subscriptionDetails.cancel_at) {
			const d = new Date(subscriptionDetails.cancel_at);
			return isNaN(d.getTime()) ? null : d;
		}
		// If cancel_at_period_end, then cancellation is effective at current period end
		if (subscriptionDetails.cancel_at_period_end && subscriptionDetails.current_period_end) {
			const d = new Date(subscriptionDetails.current_period_end);
			return isNaN(d.getTime()) ? null : d;
		}
		return null;
	};

	const cancellationEffectiveDate = getCancellationEffectiveDate();
	const showCancelsByTag =
		subscriptionDetails?.subscription_status === SUBSCRIPTION_STATUS.ACTIVE &&
		!!cancellationEffectiveDate &&
		(() => {
			const now = new Date();
			const diffMs = cancellationEffectiveDate.getTime() - now.getTime();
			const diffDays = diffMs / (1000 * 60 * 60 * 24);
			return diffDays >= 0 && diffDays <= 15;
		})();
	// Prefer explicit end_date if it's a meaningful value and within 15 days (avoid epoch/default like 1970/0001)
	const showEndDateTag = (() => {
		const dStr = subscriptionDetails?.end_date;
		if (!dStr) return false;
		const d = new Date(dStr);
		if (isNaN(d.getTime())) return false;
		const year = d.getUTCFullYear();
		// Treat early sentinel years as "default" (e.g., 0001, 1970, 1971)
		if (year <= 1971) return false;
		const now = new Date();
		const diffMs = d.getTime() - now.getTime();
		const diffDays = diffMs / (1000 * 60 * 60 * 24);
		return diffDays >= 0 && diffDays <= 15;
	})();
	// Local formatter to show date without year (e.g., "Nov 12")
	const formatDateNoYear = (dateString: string | Date) => {
		const d = new Date(dateString);
		if (isNaN(d.getTime())) return '--';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	return (
		<div>
			{isPaused && activePauseDetails && (
				<SubscriptionPauseWarning
					pauseStartDate={activePauseDetails.pause_start}
					pauseEndDate={activePauseDetails.pause_end}
					resumeDate={activePauseDetails.resumed_at || activePauseDetails.pause_end}
				/>
			)}

			<Card className='card'>
				<div className='flex justify-between items-center'>
					<FormHeader title='Subscription details' variant='sub-header' titleClassName='font-semibold' />
					<SubscriptionActionButton subscription={subscriptionDetails!} />
				</div>
				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Subscription name</p>
					<p className='text-[#09090B] text-sm'>{subscriptionDetails?.plan.name ?? '--'}</p>
				</div>
				<Spacer className='!my-4' />
				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Status</p>
					<div className='text-[#09090B] text-sm flex items-center gap-2'>
						{getSubscriptionStatus(subscriptionDetails?.subscription_status ?? '')}
						{showEndDateTag ? (
							<Chip variant='default' label={`Cancels on ${formatDateNoYear(subscriptionDetails!.end_date)}`} />
						) : (
							showCancelsByTag &&
							cancellationEffectiveDate && (
								<Chip variant='default' label={`Cancels by ${formatDateShort(cancellationEffectiveDate.toISOString())}`} />
							)
						)}
					</div>
				</div>
				<Spacer className='!my-4' />

				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Billing cycle</p>
					<p className='text-[#09090B] text-sm'>{subscriptionDetails?.billing_cycle || '--'}</p>
				</div>
				<Spacer className='!my-4' />

				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Commitment Period</p>
					<p className='text-[#09090B] text-sm'>{getCommitmentPeriodLabel(subscriptionDetails)}</p>
				</div>
				<Spacer className='!my-4' />

				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Payment terms</p>
					<p className='text-[#09090B] text-sm'>{subscriptionDetails?.payment_terms ?? '--'}</p>
				</div>
				<Spacer className='!my-4' />

				{subscriptionDetails?.invoicing_customer_id && subscriptionDetails.invoicing_customer_id !== subscriptionDetails.customer_id && (
					<>
						<div className='w-full flex justify-between items-center'>
							<p className='text-[#71717A] text-sm'>Invoicing Customer</p>
							<Link
								to={`${RouteNames.customers}/${subscriptionDetails.invoicing_customer_id}`}
								className='inline-flex items-center text-sm gap-1.5 hover:underline transition-colors'>
								{invoicingCustomer?.name || invoicingCustomer?.external_id || subscriptionDetails.invoicing_customer_id}
								<ExternalLink className='w-3.5 h-3.5' />
							</Link>
						</div>
						<Spacer className='!my-4' />
					</>
				)}

				{subscriptionDetails?.parent_subscription_id && (
					<>
						<div className='w-full flex justify-between items-center'>
							<p className='text-[#71717A] text-sm'>Parent subscription</p>
							<Link
								to={`${RouteNames.subscriptions}/${subscriptionDetails.parent_subscription_id}/edit`}
								className='inline-flex items-center text-sm gap-1.5 hover:underline transition-colors'>
								{subscriptionDetails.parent_subscription_id}
								<ExternalLink className='w-3.5 h-3.5' />
							</Link>
						</div>
						<Spacer className='!my-4' />
					</>
				)}

				{subscriptionDetails?.commitment_amount && (
					<div className='w-full flex justify-between items-center'>
						<p className='text-[#71717A] text-sm'>Commitment</p>
						<p className='text-[#09090B] text-sm'>
							{getCurrencySymbol(subscriptionDetails?.currency || '')} {subscriptionDetails?.commitment_amount || '0'}/{' '}
							{getCommitmentPeriodLabel(subscriptionDetails)}
						</p>
					</div>
				)}
				<Spacer className='!my-4' />

				{subscriptionDetails?.overage_factor && subscriptionDetails?.overage_factor > 1 && (
					<div className='w-full flex justify-between items-center'>
						<p className='text-[#71717A] text-sm'>Overage Factor</p>
						<p className='text-[#09090B] text-sm'>{subscriptionDetails?.overage_factor}</p>
					</div>
				)}
				<Spacer className='!my-4' />

				<div className='w-full flex justify-between items-center'>
					<p className='text-[#71717A] text-sm'>Start date</p>
					<p className='text-[#09090B] text-sm'>{formatDateShort(subscriptionDetails?.start_date ?? '')}</p>
				</div>
				<Spacer className='!my-4' />
			</Card>

			{subscriptionTaxAssociations?.items && subscriptionTaxAssociations.items.length > 0 && (
				<Card className='card mt-8'>
					<FormHeader title='Tax Associations' variant='sub-header' titleClassName='font-semibold' />
					<div className='mt-4'>
						<TaxAssociationTable data={subscriptionTaxAssociations.items} />
					</div>
				</Card>
			)}

			{/* subscription schedule */}
			{subscriptionDetails?.schedule?.phases?.length && subscriptionDetails?.schedule?.phases?.length > 0 && (
				<Card className='card mt-8'>
					<FormHeader title='Subscription Phases' variant='sub-header' titleClassName='font-semibold' />
					<div className='flex flex-col gap-4 pl-6'>
						{subscriptionDetails?.schedule?.phases?.length ? (
							subscriptionDetails.schedule.phases.map((phase, idx) => (
								<div key={idx} className='flex items-stretch gap-4 relative'>
									{/* Timeline Dot & Line */}
									<div className='flex flex-col items-center mr-2'>
										<div
											className={`w-2.5 h-2.5 rounded-full ${idx === subscriptionDetails.schedule.current_phase_index ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
										{idx < subscriptionDetails.schedule.phases.length - 1 && (
											<div className='w-0.5 flex-1 bg-gray-200' style={{ minHeight: 40 }}></div>
										)}
									</div>
									{/* Phase Card */}
									<div className='flex-1'>
										<div className='rounded-2xl border border-gray-100 bg-[#FAFAFA] px-8 py-5 flex flex-col gap-1'>
											<div className='text-sm font-medium text-gray-400 mb-2'>Phase {idx + 1}</div>
											<div className='grid grid-cols-4 gap-8'>
												<div>
													<div className='text-xs text-gray-400'>Start</div>
													<div className='font-normal text-lg text-gray-900'>{formatDateShort(phase.start_date.toString())}</div>
												</div>
												<div>
													<div className='text-xs text-gray-400'>End</div>
													<div className='font-normal text-lg text-gray-900'>
														{phase.end_date ? formatDateShort(phase.end_date.toString()) : '--'}
													</div>
												</div>
												{/* Commitment and overage info removed - not available in SubscriptionPhase model */}
											</div>
										</div>
									</div>
								</div>
							))
						) : (
							<span className='text-[#71717A] text-sm'>No phases found.</span>
						)}
					</div>
				</Card>
			)}

			{subscriptionDetails?.subscription_status !== SUBSCRIPTION_STATUS.DRAFT && (data?.line_items?.length ?? 0) > 0 && (
				<div className='card !mt-4'>
					<SubscriptionPreviewLineItemTable
						discount={data?.total_discount}
						subtotal={data?.subtotal}
						invoiceType={data?.invoice_type as INVOICE_TYPE}
						refetch={refetch}
						currency={data?.currency}
						amount_due={data?.amount_due}
						tax={data?.total_tax}
						title='Upcoming Invoices'
						subtitle={`This is a preview of the invoice that will be billed on ${formatDateShort(subscriptionDetails?.current_period_end ?? '')}. It may change if subscription is updated.`}
						data={data?.line_items ?? []}
					/>
				</div>
			)}

			<UpcomingCreditGrantApplicationsTable data={upcomingCreditGrantApplications?.items ?? []} customerId={customerId} />
		</div>
	);
};

export default CustomerSubscriptionDetailsPage;
