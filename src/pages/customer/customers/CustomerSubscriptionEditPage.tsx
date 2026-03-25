import { Loader, Page, Spacer } from '@/components/atoms';
import {
	SubscriptionEntitlementsSection,
	SubscriptionAddonsSection,
	SubscriptionEditDetailsHeader,
	SubscriptionEditChargesSection,
	SubscriptionEditCreditGrantsSection,
	InheritedCustomersTable,
	AddInheritedCustomersDialog,
} from '@/components/molecules';
import { useBreadcrumbsStore } from '@/store/useBreadcrumbsStore';
import CustomerApi from '@/api/CustomerApi';
import SubscriptionApi from '@/api/SubscriptionApi';
import CreditGrantApi from '@/api/CreditGrantApi';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router';
import { LineItem, SUBSCRIPTION_STATUS, SUBSCRIPTION_TYPE } from '@/models/Subscription';
import PriceOverrideDialog from '@/components/molecules/PriceOverrideDialog/PriceOverrideDialog';
import AddSubscriptionChargeDialog, {
	type AddedSubscriptionLineItem,
} from '@/components/organisms/Subscription/AddSubscriptionChargeDialog';
import {
	CreateSubscriptionLineItemRequest,
	DeleteSubscriptionLineItemRequest,
	UpdateSubscriptionLineItemRequest,
	UpdateSubscriptionRequest,
	ExecuteSubscriptionInheritanceRequest,
} from '@/types/dto/Subscription';
import { ExtendedPriceOverride } from '@/utils/common/price_override_helpers';
import { convertPriceOverrideToLineItemUpdate } from '@/utils/subscription/priceOverrideToLineItemUpdate';
import { lineItemToPrice } from '@/utils/subscription/lineItemToPrice';
import { useSubscriptionLineItemsGrouped } from '@/hooks/useSubscriptionLineItemsGrouped';
import { RouteNames } from '@/core/routes/Routes';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { ENTITY_STATUS, CreditGrant, Customer } from '@/models';

type Params = {
	id: string;
};

const CustomerSubscriptionEditPage: React.FC = () => {
	const { id: subscriptionId } = useParams<Params>();
	const [editingLineItem, setEditingLineItem] = useState<LineItem | null>(null);
	const [overriddenPrices, setOverriddenPrices] = useState<Record<string, ExtendedPriceOverride>>({});

	const [isAddCreditGrantModalOpen, setIsAddCreditGrantModalOpen] = useState(false);
	const [creditGrantToCancel, setCreditGrantToCancel] = useState<CreditGrant | null>(null);

	const [updateSubscriptionDrawerOpen, setUpdateSubscriptionDrawerOpen] = useState(false);
	const [isAddChargeDialogOpen, setIsAddChargeDialogOpen] = useState(false);
	const [isAddCustomersDialogOpen, setIsAddCustomersDialogOpen] = useState(false);
	const [inheritedCustomerIds, setInheritedCustomerIds] = useState<string[]>([]);

	const { updateBreadcrumb } = useBreadcrumbsStore();

	const {
		data: subscriptionDetails,
		isLoading: isSubscriptionDetailsLoading,
		isError: isSubscriptionDetailsError,
	} = useQuery({
		queryKey: ['subscriptionDetailsEditPage', subscriptionId],
		queryFn: async () => {
			return await SubscriptionApi.getSubscription(subscriptionId!);
		},
		enabled: !!subscriptionId,
	});

	const { data: customer } = useQuery({
		queryKey: ['fetchCustomerDetailsEditPage', subscriptionDetails?.customer_id],
		queryFn: async () => await CustomerApi.getCustomerById(subscriptionDetails?.customer_id ?? ''),
		enabled: !!subscriptionDetails?.customer_id && !!subscriptionDetails?.customer_id,
	});

	const { data: creditGrants } = useQuery({
		queryKey: ['creditGrantsEditPage', subscriptionId],
		queryFn: async () => {
			return await CreditGrantApi.list({
				subscription_ids: [subscriptionId!],
				status: ENTITY_STATUS.PUBLISHED,
			});
		},
		enabled:
			!!subscriptionDetails &&
			subscriptionDetails.subscription_status !== SUBSCRIPTION_STATUS.CANCELLED &&
			subscriptionDetails.subscription_status !== SUBSCRIPTION_STATUS.TRIALING &&
			!!subscriptionId,
	});

	const { mutate: updateLineItem } = useMutation({
		mutationFn: async ({ lineItemId, updateData }: { lineItemId: string; updateData: UpdateSubscriptionLineItemRequest }) => {
			return await SubscriptionApi.updateSubscriptionLineItem(lineItemId, updateData);
		},
		onSuccess: () => {
			toast.success('Line item updated successfully');
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to update line item');
		},
	});

	const { mutate: terminateLineItem } = useMutation({
		mutationFn: async ({ lineItemId, endDate }: { lineItemId: string; endDate?: string }) => {
			const payload: DeleteSubscriptionLineItemRequest = {};
			if (endDate) {
				payload.effective_from = endDate;
			}
			return await SubscriptionApi.deleteSubscriptionLineItem(lineItemId, payload);
		},
		onSuccess: () => {
			toast.success('Line item terminated successfully');
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to terminate line item');
		},
	});

	const { mutate: createLineItem } = useMutation({
		mutationFn: async (payload: CreateSubscriptionLineItemRequest) => {
			return await SubscriptionApi.createSubscriptionLineItem(subscriptionId!, payload);
		},
		onSuccess: () => {
			toast.success('Charge added successfully');
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
			setIsAddChargeDialogOpen(false);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to add charge');
		},
	});

	const { mutate: updateSubscription, isPending: isUpdatingSubscription } = useMutation({
		mutationFn: async (payload: UpdateSubscriptionRequest) => {
			return await SubscriptionApi.updateSubscription(subscriptionId!, payload);
		},
		onSuccess: () => {
			toast.success('Subscription updated successfully');
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
			refetchQueries(['subscriptions']);
			setUpdateSubscriptionDrawerOpen(false);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to update subscription');
		},
	});

	const { mutate: createCreditGrant } = useMutation({
		mutationFn: async (data: any) => {
			return await CreditGrantApi.create(data);
		},
		onSuccess: () => {
			toast.success('Credit grant created successfully');
			refetchQueries(['creditGrantsEditPage', subscriptionId!]);
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
			setIsAddCreditGrantModalOpen(false);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to create credit grant');
		},
	});

	const { mutate: deleteCreditGrant } = useMutation({
		mutationFn: async ({ creditGrantId, effectiveDate }: { creditGrantId: string; effectiveDate: string }) => {
			const deleteRequest: { effective_date?: string } = effectiveDate ? { effective_date: effectiveDate } : {};
			return await CreditGrantApi.delete(creditGrantId, deleteRequest);
		},
		onSuccess: () => {
			toast.success('Credit grant deleted successfully');
			refetchQueries(['creditGrantsEditPage', subscriptionId!]);
			refetchQueries(['subscriptionDetailsEditPage', subscriptionId!]);
			setCreditGrantToCancel(null);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to delete credit grant');
		},
	});

	const { mutate: executeInheritance, isPending: isExecutingInheritance } = useMutation({
		mutationFn: (payload: ExecuteSubscriptionInheritanceRequest) => SubscriptionApi.executeInheritance(subscriptionId!, payload),
		onSuccess: () => {
			toast.success('Customers added successfully');
			refetchQueries(['inheritedSubscriptions', subscriptionId!]);
			setIsAddCustomersDialogOpen(false);
		},
		onError: (error: { error?: { message?: string } }) => {
			toast.error(error?.error?.message || 'Failed to add customers');
		},
	});

	useEffect(() => {
		if (subscriptionDetails?.plan?.name) {
			updateBreadcrumb(2, `Subscription`, `${RouteNames.customers}/${customer?.id}/subscription/${subscriptionId}`);
		}

		if (customer?.external_id) {
			updateBreadcrumb(1, customer.external_id, `${RouteNames.customers}/${customer.id}`);
		}
	}, [subscriptionDetails, updateBreadcrumb, customer, subscriptionId]);

	const { groupedLineItems, phaseDetails } = useSubscriptionLineItemsGrouped(subscriptionDetails ?? undefined);

	const handleEditLineItem = useCallback((lineItem: LineItem) => {
		setEditingLineItem(lineItem);
	}, []);

	const handleTerminateLineItem = useCallback(
		(lineItemId: string, endDate?: string) => {
			terminateLineItem({ lineItemId, endDate });
		},
		[terminateLineItem],
	);

	const handlePriceOverride = useCallback(
		(priceId: string, override: Partial<ExtendedPriceOverride>) => {
			if (!editingLineItem) return;
			const updateData = convertPriceOverrideToLineItemUpdate(priceId, override);
			updateLineItem({ lineItemId: editingLineItem.id, updateData });
			setEditingLineItem(null);
		},
		[editingLineItem, updateLineItem],
	);

	const handleResetOverride = useCallback((priceId: string) => {
		setOverriddenPrices((prev) => {
			const newOverrides = { ...prev };
			delete newOverrides[priceId];
			return newOverrides;
		});
	}, []);

	const handleCreateCreditGrant = useCallback(
		(data: unknown) => {
			createCreditGrant(data);
		},
		[createCreditGrant],
	);

	const handleCancelCreditGrant = useCallback((grant: CreditGrant) => {
		setCreditGrantToCancel(grant);
	}, []);

	const handleConfirmCancelCreditGrant = useCallback(
		(effectiveDate: string) => {
			if (creditGrantToCancel) {
				deleteCreditGrant({
					creditGrantId: creditGrantToCancel.id,
					effectiveDate: effectiveDate || new Date().toISOString(),
				});
			}
		},
		[creditGrantToCancel, deleteCreditGrant],
	);

	const handleCloseCancelModal = useCallback(() => {
		setCreditGrantToCancel(null);
	}, []);

	const handleAddChargeSave = useCallback(
		(item: AddedSubscriptionLineItem) => {
			const { tempId, ...request } = item;
			void tempId; // omitted from API request
			createLineItem(request as CreateSubscriptionLineItemRequest);
		},
		[createLineItem],
	);

	const handleAddInheritedCustomers = useCallback(
		(customers: Customer[]) => {
			executeInheritance({
				customer_ids_to_inherit_subscription: customers.map((c) => c.id),
			});
		},
		[executeInheritance],
	);

	if (isSubscriptionDetailsLoading) {
		return <Loader />;
	}

	if (isSubscriptionDetailsError) {
		toast.error('Error loading subscription data');
		return null;
	}

	if (!subscriptionDetails) {
		toast.error('No subscription data available');
		return null;
	}

	return (
		<Page documentTitle='Edit Subscription' heading='Edit Subscription'>
			<div className='space-y-6'>
				<SubscriptionEditDetailsHeader
					subscription={subscriptionDetails}
					subscriptionId={subscriptionId!}
					onUpdate={updateSubscription}
					isUpdating={isUpdatingSubscription}
					updateDrawerOpen={updateSubscriptionDrawerOpen}
					onUpdateDrawerOpenChange={setUpdateSubscriptionDrawerOpen}
				/>

				<SubscriptionEditChargesSection
					groupedLineItems={groupedLineItems}
					phaseDetails={phaseDetails}
					allLineItems={subscriptionDetails?.line_items ?? []}
					isLoading={isSubscriptionDetailsLoading}
					onEditLineItem={handleEditLineItem}
					onTerminateLineItem={handleTerminateLineItem}
					onAddCharge={() => setIsAddChargeDialogOpen(true)}
					isAddChargeDisabled={
						subscriptionDetails?.subscription_status === SUBSCRIPTION_STATUS.CANCELLED ||
						subscriptionDetails?.subscription_status === SUBSCRIPTION_STATUS.TRIALING
					}
				/>

				<SubscriptionEditCreditGrantsSection
					creditGrants={creditGrants?.items ?? []}
					isAddDisabled={
						subscriptionDetails?.subscription_status === SUBSCRIPTION_STATUS.CANCELLED ||
						subscriptionDetails?.subscription_status === SUBSCRIPTION_STATUS.TRIALING
					}
					onAddClick={() => setIsAddCreditGrantModalOpen(true)}
					onRequestCancel={handleCancelCreditGrant}
					subscriptionId={subscriptionId!}
					subscriptionStartDate={subscriptionDetails?.start_date}
					subscriptionCurrentPeriodEnd={subscriptionDetails?.current_period_end}
					onSaveCreditGrant={handleCreateCreditGrant}
					isAddModalOpen={isAddCreditGrantModalOpen}
					onAddModalOpenChange={setIsAddCreditGrantModalOpen}
					creditGrantToCancel={creditGrantToCancel}
					onConfirmCancelCreditGrant={handleConfirmCancelCreditGrant}
					onCloseCancelModal={handleCloseCancelModal}
				/>

				{/* Inherited customers panel — only shown for parent subscriptions */}
				{subscriptionDetails?.subscription_type === SUBSCRIPTION_TYPE.PARENT && subscriptionId && (
					<>
						<InheritedCustomersTable
							parentSubscriptionId={subscriptionId}
							onAddCustomers={() => setIsAddCustomersDialogOpen(true)}
							onCustomerIdsLoaded={setInheritedCustomerIds}
						/>
						<AddInheritedCustomersDialog
							isOpen={isAddCustomersDialogOpen}
							onOpenChange={setIsAddCustomersDialogOpen}
							onConfirm={handleAddInheritedCustomers}
							excludeIds={inheritedCustomerIds}
							isLoading={isExecutingInheritance}
						/>
					</>
				)}

				{subscriptionId && <SubscriptionEntitlementsSection subscriptionId={subscriptionId} />}

				{subscriptionId && <SubscriptionAddonsSection subscriptionId={subscriptionId} />}

				{editingLineItem && (
					<PriceOverrideDialog
						isOpen={true}
						onOpenChange={(open) => !open && setEditingLineItem(null)}
						price={lineItemToPrice(editingLineItem)}
						onPriceOverride={handlePriceOverride}
						onResetOverride={handleResetOverride}
						overriddenPrices={overriddenPrices}
						showEffectiveFrom={true}
					/>
				)}

				<AddSubscriptionChargeDialog
					isOpen={isAddChargeDialogOpen}
					onOpenChange={setIsAddChargeDialogOpen}
					onSave={handleAddChargeSave}
					defaultCurrency={subscriptionDetails?.currency}
					defaultBillingPeriod={subscriptionDetails?.billing_period}
					defaultStartDate={subscriptionDetails?.start_date}
					subscriptionId={subscriptionId}
				/>

				<Spacer className='!h-20' />
			</div>
		</Page>
	);
};

export default CustomerSubscriptionEditPage;
