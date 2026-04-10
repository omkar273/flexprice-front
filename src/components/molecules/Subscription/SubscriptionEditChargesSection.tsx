import { FC } from 'react';
import { Card, AddButton, NoDataCard } from '@/components/atoms';
import SubscriptionLineItemTable from '@/components/molecules/SubscriptionLineItemTable/SubscriptionLineItemTable';
import type { LineItem, SubscriptionCommitmentInfo } from '@/models/Subscription';
import formatDate from '@/utils/common/format_date';
import type { GroupedLineItems } from '@/hooks/useSubscriptionLineItemsGrouped';
import type { PhaseDetail } from '@/hooks/useSubscriptionLineItemsGrouped';

export type { SubscriptionCommitmentInfo };

/** Subscription edit page: charges (line items) with and without phase. */
export interface SubscriptionEditChargesSectionProps {
	groupedLineItems: GroupedLineItems;
	phaseDetails: Record<string, PhaseDetail>;
	allLineItems: LineItem[];
	isLoading: boolean;
	onEditLineItem: (lineItem: LineItem) => void;
	onTerminateLineItem: (lineItemId: string, endDate?: string) => void;
	/** When provided, shows Add charge button next to Charges header. */
	onAddCharge?: () => void;
	/** Disable Add charge button (e.g. when subscription is cancelled/trialing). */
	isAddChargeDisabled?: boolean;
	/** Subscription-level commitment info to show on usage line items. */
	commitmentInfo?: SubscriptionCommitmentInfo;
}

const SubscriptionEditChargesSection: FC<SubscriptionEditChargesSectionProps> = ({
	groupedLineItems,
	phaseDetails,
	allLineItems,
	isLoading,
	onEditLineItem,
	onTerminateLineItem,
	onAddCharge,
	isAddChargeDisabled = false,
	commitmentInfo,
}) => {
	const hasWithoutPhase = groupedLineItems.withoutPhase.length > 0;
	const phaseIds = Object.keys(groupedLineItems.byPhase);
	const hasPhases = phaseIds.length > 0;
	const isEmpty = !hasWithoutPhase && !hasPhases;

	const sortedPhaseEntries = [...phaseIds].sort((phaseIdA, phaseIdB) => {
		const startDateA = phaseDetails[phaseIdA]?.startDate;
		const startDateB = phaseDetails[phaseIdB]?.startDate;
		if (!startDateA && !startDateB) return 0;
		if (!startDateA) return 1;
		if (!startDateB) return -1;
		return new Date(startDateA).getTime() - new Date(startDateB).getTime();
	});

	const chargesHeader = (count: number) => (
		<div className='flex items-center justify-between gap-2 mb-4'>
			<div className='flex items-center gap-2'>
				<h3 className='text-lg font-semibold text-gray-900'>Charges</h3>
				<span className='text-sm text-gray-500'>({count} items)</span>
			</div>
			{onAddCharge && <AddButton onClick={onAddCharge} disabled={isAddChargeDisabled} />}
		</div>
	);

	return (
		<>
			{hasWithoutPhase && (
				<Card variant='notched'>
					{chargesHeader(groupedLineItems.withoutPhase.length)}
					<SubscriptionLineItemTable
						data={groupedLineItems.withoutPhase}
						isLoading={isLoading}
						onEdit={onEditLineItem}
						onTerminate={onTerminateLineItem}
						hideCardWrapper={true}
						commitmentInfo={commitmentInfo}
						paginationPrefix='sub_line_items'
					/>
				</Card>
			)}

			{isEmpty && onAddCharge && (
				<NoDataCard
					title='Charges'
					subtitle='No charges found for this subscription yet'
					cta={<AddButton onClick={onAddCharge} disabled={isAddChargeDisabled} />}
				/>
			)}

			{isEmpty && !onAddCharge && (
				<SubscriptionLineItemTable
					data={allLineItems}
					isLoading={isLoading}
					onEdit={onEditLineItem}
					onTerminate={onTerminateLineItem}
					commitmentInfo={commitmentInfo}
					paginationPrefix='sub_line_items'
				/>
			)}

			{hasPhases && (
				<div className='space-y-6'>
					{sortedPhaseEntries.map((phaseId, index) => {
						const lineItems = groupedLineItems.byPhase[phaseId];
						const phase = phaseDetails[phaseId];
						const phaseNumber = index + 1;
						const startDate = phase?.startDate ? formatDate(phase.startDate) : 'N/A';
						const endDate = phase?.endDate ? formatDate(phase.endDate) : 'Forever';

						return (
							<Card key={phaseId} variant='notched'>
								<div className='mb-4 pb-4 border-b border-gray-200'>
									<h3 className='text-base font-semibold text-gray-900'>Phase {phaseNumber}</h3>
									<p className='text-sm text-gray-600 mt-1'>
										{startDate} → {endDate}
									</p>
								</div>
								<SubscriptionLineItemTable
									data={lineItems}
									isLoading={isLoading}
									onEdit={onEditLineItem}
									onTerminate={onTerminateLineItem}
									hideCardWrapper={true}
									commitmentInfo={commitmentInfo}
									paginationPrefix={`sub_line_items_phase_${index}`}
								/>
							</Card>
						);
					})}
				</div>
			)}
		</>
	);
};

export default SubscriptionEditChargesSection;
