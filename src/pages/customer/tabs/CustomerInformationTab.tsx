import { Spacer, Button, Divider } from '@/components/atoms';
import CustomerApi from '@/api/CustomerApi';
import ConnectionApi from '@/api/ConnectionApi';
import { useQuery } from '@tanstack/react-query';
import { Country } from 'country-state-city';
import { CreateCustomerDrawer, Detail, DetailsCard, MetadataModal, SaveCardModal } from '@/components/molecules';
import { useParams, useOutletContext } from 'react-router';
import { Pencil, CreditCard, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTypographyClass } from '@/lib/typography';
import { refetchQueries } from '@/core/services/tanstack/ReactQueryProvider';
import { logger } from '@/utils/common/Logger';
import { CONNECTION_PROVIDER_TYPE } from '@/models/Connection';
import { useCustomerPortalUrl } from '@/hooks/useCustomerPortalUrl';

type ContextType = {
	isArchived: boolean;
};

const filterStringMetadata = (meta: Record<string, unknown> | undefined): Record<string, string> => {
	if (!meta) return {};
	return Object.fromEntries(Object.entries(meta).filter(([_, v]) => typeof v === 'string') as [string, string][]);
};

const CustomerInformationTab = () => {
	const { id: customerId } = useParams();
	const { isArchived } = useOutletContext<ContextType>();

	const { data: customer, isLoading } = useQuery({
		queryKey: ['fetchCustomerDetails', customerId],
		queryFn: () => CustomerApi.getCustomerById(customerId!),
		enabled: !!customerId,
	});

	// Fetch Stripe connections to check availability
	const { data: connectionsResponse } = useQuery({
		queryKey: ['connections', CONNECTION_PROVIDER_TYPE.STRIPE],
		queryFn: () => ConnectionApi.ListPublished(),
		enabled: !!customerId && !isArchived,
	});

	const [showMetadataModal, setShowMetadataModal] = useState(false);
	const [customerDrawerOpen, setcustomerDrawerOpen] = useState(false);
	const [showSaveCardModal, setShowSaveCardModal] = useState(false);
	const [metadata, setMetadata] = useState<Record<string, string>>(filterStringMetadata(customer?.metadata));

	// Use customer portal hook with external_id
	const { copyToClipboard } = useCustomerPortalUrl(customer?.external_id);

	// Check if Stripe connection is available
	const hasStripeConnection =
		connectionsResponse?.connections?.some((connection) => connection.provider_type === CONNECTION_PROVIDER_TYPE.STRIPE) || false;

	// Get current URL for success/cancel redirects
	const currentUrl = window.location.href;

	// Update metadata state when customer changes
	useEffect(() => {
		setMetadata(filterStringMetadata(customer?.metadata));
	}, [customer]);

	const billingDetails: Detail[] = [
		{
			label: 'Name',
			value: customer?.name || '--',
		},
		{
			label: 'External ID',
			value: customer?.external_id || '--',
		},
		{
			label: 'Email',
			value: customer?.email || '--',
		},
		{
			variant: 'divider',
		},
		{
			variant: 'heading',
			label: 'Billing Details',
			className: getTypographyClass('card-header') + '!text-[16px]',
		},
		{
			label: 'Address Line 1',
			value: customer?.address_line1 || '--',
		},
		{
			label: 'Country',
			value: customer?.address_country ? Country.getCountryByCode(customer.address_country)?.name : '--',
		},
		{
			label: 'Address Line 2',
			value: customer?.address_line2 || '--',
		},
		{
			label: 'State',
			value: customer?.address_state || '--',
		},
		{
			label: 'City',
			value: customer?.address_city || '--',
		},
		{
			label: 'Postal Code',
			value: customer?.address_postal_code || '--',
		},
	];

	if (isLoading) {
		return (
			<div className='py-6 px-4 rounded-xl border border-gray-300'>
				<p className='text-gray-600'>Loading customer details...</p>
			</div>
		);
	}

	return (
		<div>
			{billingDetails.filter((detail) => detail.value !== '--').length > 0 && (
				<div>
					<Spacer className='!h-4' />
					<div className='flex justify-between items-center'>
						<h3 className={getTypographyClass('card-header') + '!text-[16px]'}>Customer Details</h3>
						<div className='flex gap-2'>
							{!isArchived && hasStripeConnection && (
								<Button variant='outline' size='sm' onClick={() => setShowSaveCardModal(true)} className='flex items-center gap-2'>
									<CreditCard className='size-4' />
									Save Card on Stripe
								</Button>
							)}
							{!isArchived && (
								<>
									<Button variant='outline' size='icon' onClick={copyToClipboard} title='Share Customer Portal Link'>
										<Share2 className='size-4' />
									</Button>
									<CreateCustomerDrawer
										trigger={
											<Button variant={'outline'} size={'icon'}>
												<Pencil />
											</Button>
										}
										open={customerDrawerOpen}
										onOpenChange={setcustomerDrawerOpen}
										data={customer}
									/>
								</>
							)}
						</div>
					</div>
					<Spacer className='!h-4' />
					<DetailsCard variant='stacked' data={billingDetails} childrenAtTop cardStyle='borderless' />

					{/* Metadata Section Below Address Details */}
					<Divider className='my-4' />
					<div className='mt-8'>
						<div className='flex justify-between items-center mb-2'>
							<h3 className={getTypographyClass('card-header') + '!text-[16px]'}>Metadata</h3>
							{!isArchived && (
								<Button variant='outline' size='icon' onClick={() => setShowMetadataModal(true)}>
									<Pencil className='size-5' />
								</Button>
							)}
						</div>
						<DetailsCard
							variant='stacked'
							data={
								metadata && Object.keys(metadata).length > 0
									? Object.entries(metadata).map(([key, value]) => ({ label: key, value }))
									: [{ label: 'No metadata available.', value: '' }]
							}
							cardStyle='borderless'
						/>
					</div>

					{/* Metadata Modal for Editing */}
					<MetadataModal
						open={showMetadataModal}
						data={metadata}
						onSave={async (newMetadata) => {
							if (!customerId) return;
							try {
								const updated = await CustomerApi.updateCustomer({ metadata: newMetadata }, customerId);
								setMetadata(filterStringMetadata(updated.metadata));
								setShowMetadataModal(false);
								refetchQueries(['fetchCustomerDetails', customerId]);
							} catch (e) {
								logger.error('Failed to update metadata', e);
							}
						}}
						onClose={() => setShowMetadataModal(false)}
					/>

					{/* Save Card Modal */}
					<SaveCardModal isOpen={showSaveCardModal} onOpenChange={setShowSaveCardModal} customerId={customerId!} currentUrl={currentUrl} />
				</div>
			)}
		</div>
	);
};

export default CustomerInformationTab;
