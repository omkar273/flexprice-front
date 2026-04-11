import { useState } from 'react';
import { Check, Coins, Eye, Gauge, Info, Mail, MessageSquare, Phone, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Button } from '@/components/ui';
import { formatBillingPeriodForPrice, getCurrencySymbol } from '@/utils';
import { Link, useNavigate } from 'react-router';
import { RouteNames } from '@/core/routes/Routes';
import { formatAmount } from '@/components/atoms/Input/Input';
import { PlanType } from '@/constants/planTypes';
import { cn } from '@/lib/utils';
export interface UsageCharge {
	amount?: string;
	currency?: string;
	billing_model: string;
	tiers?: Array<{
		up_to: number | null;
		unit_amount: string;
		flat_amount: string;
	}> | null;
	matter_name?: string;
	meter_name?: string;
}

export interface PricingCardProps {
	id: string;
	name: string;
	description: string;
	price: {
		amount?: string;
		currency?: string;
		billingPeriod?: string;
		type?: string;
		displayType: PlanType;
	};
	usageCharges?: UsageCharge[];
	entitlements: Array<{
		id: string;
		feature_id: string;
		name: string;
		type: 'STATIC' | 'BOOLEAN' | 'METERED';
		value: string | number | boolean;
		description?: string;
		usage_reset_period?: string;
	}>;
	onPurchase?: () => void;
	className?: string;
	showUsageCharges?: boolean;
	/** When true, replaces the "View plan" navigation button with a disabled "Will be created" label. */
	isPreview?: boolean;
	/** Per-plan credit grants (AI preview only; keeps grants on-card instead of a separate panel). */
	creditGrants?: Array<{
		name: string;
		credits: number;
		cadence: 'onetime' | 'recurring';
		period?: 'monthly' | 'annual' | null;
	}>;
}

const formatEntitlementValue = ({
	type,
	value,
	name,
	usage_reset_period,
	feature_id,
}: {
	type: string;
	value: string | number | boolean;
	name: string;
	usage_reset_period: string;
	feature_id: string;
}) => {
	const feature = feature_id ? (
		<Link
			to={`${RouteNames.featureDetails}/${feature_id}`}
			className='hover:underline decoration-dashed decoration-[0.5px] decoration-muted-foreground/50 underline-offset-4'>
			{name}
		</Link>
	) : (
		name
	);

	switch (type) {
		case 'STATIC':
			return (
				<>
					{value} {feature}
				</>
			);
		case 'BOOLEAN':
			return <>{value ? feature : `${feature} Not included`}</>;
		case 'METERED':
			return (
				<>
					{formatAmount(value.toString())} {feature}
					{usage_reset_period ? ` per ${formatBillingPeriodForPrice(usage_reset_period)}` : ''}
				</>
			);
		default:
			return `${value} ${feature}`;
	}
};

const PRICE_DISPLAY_CONFIG = {
	[PlanType.FREE]: { text: 'Free', showBillingPeriod: false, subtext: '' },
	[PlanType.HYBRID_FREE]: { text: '0', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.HYBRID_PAID]: { text: '', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.USAGE_ONLY]: { text: '0', showBillingPeriod: true, subtext: '+ Usage' },
	[PlanType.FIXED]: { text: '', showBillingPeriod: true, subtext: '' },
} as const;

const formatUsageCharge = (charge: UsageCharge) => {
	if (!charge.amount) return '';

	if (charge.billing_model === 'PACKAGE') {
		return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per package`;
	} else if (charge.billing_model === 'FLAT_FEE') {
		return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per unit`;
	} else if (charge.billing_model === 'TIERED' && charge.tiers?.length) {
		return `Starting at ${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.tiers[0].unit_amount)} per unit`;
	}
	return `${getCurrencySymbol(charge.currency || '')}${formatAmount(charge.amount)} per unit`;
};

/** Compact usage line for AI pricing preview (/unit instead of per unit). */
const formatUsageChargeCompact = (charge: UsageCharge) => {
	if (!charge.amount) return '';
	const sym = getCurrencySymbol(charge.currency || '');
	const amt = formatAmount(charge.amount);
	if (charge.billing_model === 'PACKAGE') {
		return `${sym}${amt}/pkg`;
	}
	if (charge.billing_model === 'TIERED' && charge.tiers?.length) {
		return `from ${sym}${formatAmount(charge.tiers[0].unit_amount)}/unit`;
	}
	return `${sym}${amt}/unit`;
};

function getEntitlementVisual(type: string, name: string): { Icon: LucideIcon; iconClass: string } {
	const n = name.toLowerCase();
	if (type === 'METERED') {
		if (n.includes('email') || n.includes('mail')) return { Icon: Mail, iconClass: 'text-sky-600' };
		if (n.includes('sms') || n.includes('chat') || n.includes('message')) return { Icon: MessageSquare, iconClass: 'text-violet-600' };
		if (n.includes('phone') || n.includes('call') || n.includes('minute')) return { Icon: Phone, iconClass: 'text-emerald-600' };
		if (n.includes('api') || n.includes('request') || n.includes('agent')) return { Icon: Zap, iconClass: 'text-amber-600' };
		return { Icon: Gauge, iconClass: 'text-indigo-600' };
	}
	return { Icon: Sparkles, iconClass: 'text-emerald-600' };
}

function formatEntitlementPreviewLine(ent: PricingCardProps['entitlements'][0]): string {
	const period = ent.usage_reset_period ? `/${formatBillingPeriodForPrice(ent.usage_reset_period)}` : '';
	switch (ent.type) {
		case 'STATIC':
			return `${ent.value} ${ent.name}`;
		case 'BOOLEAN':
			return ent.value ? String(ent.name) : `${ent.name} not included`;
		case 'METERED':
			return `${formatAmount(String(ent.value))} ${ent.name}${period}`;
		default:
			return `${ent.value} ${ent.name}`;
	}
}

const UsageChargeTooltip: React.FC<{ charge: UsageCharge }> = ({ charge }) => {
	if (charge.billing_model !== 'TIERED' || !charge.tiers) {
		return null;
	}

	const formatRange = (tier: any, index: number, allTiers: any[]) => {
		const from = index === 0 ? 1 : allTiers[index - 1].up_to + 1;
		if (tier.up_to === null || index === allTiers.length - 1) {
			return `${from} - ∞`;
		}
		return `${from} - ${tier.up_to}`;
	};

	return (
		<TooltipContent
			sideOffset={5}
			className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[320px]'>
			<div className='space-y-3'>
				<div className='font-medium border-b border-spacing-1 border-gray-200 pb-2 text-base text-gray-900'>Volume Pricing</div>
				<div className='space-y-2'>
					{charge.tiers.map((tier, index) => (
						<div key={index} className='flex flex-col gap-1'>
							<div className='flex items-center justify-between gap-6'>
								<div className='!font-normal text-muted-foreground'>{formatRange(tier, index, charge.tiers || [])} units</div>
								<div className='text-right'>
									<div className='!font-normal text-muted-foreground'>
										{getCurrencySymbol(charge.currency || '')}
										{formatAmount(tier.unit_amount)} per unit
									</div>
									{Number(tier.flat_amount) > 0 && (
										<div className='text-xs text-gray-500'>
											+ {getCurrencySymbol(charge.currency || '')}
											{formatAmount(tier.flat_amount)} flat fee
										</div>
									)}
								</div>
							</div>
							{index < (charge.tiers?.length || 0) - 1 && <div className='h-px bg-gray-100' />}
						</div>
					))}
				</div>
			</div>
		</TooltipContent>
	);
};

const VISIBLE_LIMIT = 3;

const PricingCard: React.FC<PricingCardProps> = ({
	id,
	name,
	price,
	usageCharges = [],
	entitlements,
	creditGrants = [],
	className = '',
	showUsageCharges = false,
	isPreview = false,
}) => {
	const navigate = useNavigate();
	const [showAllCharges, setShowAllCharges] = useState(false);
	const [showAllEntitlements, setShowAllEntitlements] = useState(false);

	const config = PRICE_DISPLAY_CONFIG[price.displayType];
	const displayAmount = config.text || `${getCurrencySymbol(price.currency || '')}${formatAmount(price.amount || '')}`;
	const hasUsageCharges = usageCharges.length > 0;

	const chargeLimit = isPreview ? usageCharges.length : VISIBLE_LIMIT;
	const entLimit = isPreview ? entitlements.length : VISIBLE_LIMIT;

	const visibleCharges = showAllCharges ? usageCharges : usageCharges.slice(0, chargeLimit);
	const hiddenChargesCount = isPreview ? 0 : usageCharges.length - VISIBLE_LIMIT;

	const visibleEntitlements = showAllEntitlements ? entitlements : entitlements.slice(0, entLimit);
	const hiddenEntitlementsCount = isPreview ? 0 : entitlements.length - VISIBLE_LIMIT;

	return (
		<div
			className={cn(
				'border transition-all shadow-md',
				isPreview
					? 'rounded-2xl border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100 hover:border-slate-300/90'
					: 'border-gray-200 bg-white hover:border-gray-300 rounded-3xl p-7',
				className,
			)}>
			{/* Header */}
			<div className={cn(isPreview ? 'space-y-1.5' : 'space-y-2')}>
				<h3 className={cn('font-[300] text-gray-900', isPreview ? 'text-lg' : 'text-xl')}>{name}</h3>
				{/* <p className='text-sm font-normal text-gray-500 leading-relaxed'>{description}</p> */}
			</div>

			{/* Price */}
			<div className={cn(isPreview ? 'mt-5 space-y-3' : 'mt-6 space-y-4')}>
				{/* Base Price */}
				<div className='flex flex-col'>
					<div className='flex items-baseline'>
						<span className={cn('font-normal text-gray-900', isPreview ? 'text-[28px]' : 'text-4xl')}>
							{config.text === '0' ? `${getCurrencySymbol(price.currency || '')}0` : displayAmount}
						</span>
						{config.showBillingPeriod && (
							<span className={cn('ml-2 text-gray-500', isPreview ? 'text-xs' : 'text-sm text3')}>
								/{formatBillingPeriodForPrice(price.billingPeriod || '')}
								{config.subtext && (
									<span className={cn('ml-1', isPreview ? 'text-[11px] font-semibold text-indigo-600' : 'font-medium text-lg')}>
										{config.subtext}
									</span>
								)}
							</span>
						)}
					</div>
				</div>

				{/* Credit grants (AI preview — on-card) */}
				{isPreview && creditGrants.length > 0 && (
					<div className='mt-3 space-y-1.5'>
						<p className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>Credits</p>
						<div className='flex flex-col gap-2'>
							{creditGrants.map((g, i) => (
								<div
									key={`${g.name}-${i}`}
									className='flex items-start gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-950'>
									<Coins className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600' aria-hidden />
									<div className='min-w-0'>
										<span className='font-semibold'>{g.credits.toLocaleString()} credits</span>
										<span className='text-amber-900/95'> · {g.name}</span>
										<span className='text-amber-800/85'>{g.cadence === 'recurring' && g.period ? ` · /${g.period}` : ' · one-time'}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Usage Charges Section */}
				{hasUsageCharges && showUsageCharges && (
					<div className={cn('border-t', isPreview ? 'mt-3 border-slate-100 pt-3.5' : 'pt-4')}>
						<div
							className={cn(
								'font-medium text-gray-900',
								isPreview ? 'mb-2 text-[10px] uppercase tracking-wide text-gray-400' : 'mb-2 text-sm',
							)}>
							{isPreview ? 'Usage' : 'Usage-based charges:'}
						</div>
						<div className={cn(isPreview ? 'space-y-2' : 'space-y-2')}>
							{visibleCharges.map((charge, index) => (
								<div
									key={index}
									className={cn(
										'flex items-start justify-between gap-2',
										isPreview ? 'text-[11px] leading-snug text-slate-700' : 'gap-3 text-sm text-gray-600',
									)}>
									<span className={cn('min-w-0 flex-1', !isPreview && 'leading-snug')}>{charge.meter_name}</span>
									<div className='flex items-center gap-1.5 shrink-0'>
										<span className={cn('whitespace-nowrap text-right font-medium', isPreview ? 'text-slate-800' : 'text-gray-700')}>
											{isPreview ? formatUsageChargeCompact(charge) : formatUsageCharge(charge)}
										</span>
										{charge.billing_model === 'TIERED' && charge.tiers && (
											<TooltipProvider delayDuration={0}>
												<Tooltip>
													<TooltipTrigger>
														<Info
															className={cn(
																'text-gray-400 transition-colors duration-150 hover:text-gray-500',
																isPreview ? 'h-3.5 w-3.5' : 'h-4 w-4',
															)}
														/>
													</TooltipTrigger>
													<UsageChargeTooltip charge={charge} />
												</Tooltip>
											</TooltipProvider>
										)}
									</div>
								</div>
							))}
							{!showAllCharges && hiddenChargesCount > 0 && (
								<button
									type='button'
									onClick={() => setShowAllCharges(true)}
									className='mt-1 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
									<Eye className='h-3.5 w-3.5' />+{hiddenChargesCount} more
								</button>
							)}
							{showAllCharges && usageCharges.length > VISIBLE_LIMIT && (
								<button
									type='button'
									onClick={() => setShowAllCharges(false)}
									className='mt-1 flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600'>
									Show less
								</button>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Purchase Button */}
			{!isPreview && (
				<div className='mt-6'>
					<Button
						onClick={() => {
							navigate(`${RouteNames.plan}/${id}`);
						}}
						className='w-full bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl py-3 text-sm font-medium transition-colors'
						variant='outline'>
						View plan
					</Button>
				</div>
			)}

			{/* Features List — no "Add entitlements" CTA on AI pricing preview */}
			{(entitlements.length > 0 || !isPreview) && (
				<div className={cn(isPreview ? 'mt-4 border-t border-slate-100 pt-4' : 'mt-7')}>
					{entitlements.length > 0 ? (
						<>
							{isPreview && <p className='mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>Included</p>}
							<ul className={cn(isPreview ? 'space-y-2.5' : 'space-y-3.5')}>
								{visibleEntitlements.map((entitlement) => {
									if (isPreview) {
										const { Icon, iconClass } = getEntitlementVisual(entitlement.type, entitlement.name);
										return (
											<li key={entitlement.id} className='flex items-center gap-2'>
												<Icon className={cn('h-3.5 w-3.5 shrink-0', iconClass)} strokeWidth={2} aria-hidden />
												<span className='min-w-0 flex-1 text-[11px] font-normal leading-snug text-slate-700'>
													{formatEntitlementPreviewLine(entitlement)}
												</span>
												{entitlement.description && (
													<TooltipProvider delayDuration={0}>
														<Tooltip>
															<TooltipTrigger className='cursor-pointer shrink-0'>
																<Info className='h-3.5 w-3.5 text-gray-400 transition-colors hover:text-gray-500' />
															</TooltipTrigger>
															<TooltipContent
																sideOffset={5}
																className='max-w-[200px] rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white'>
																{entitlement.description}
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												)}
											</li>
										);
									}
									return (
										<li key={entitlement.id} className='flex items-center gap-3'>
											<Check className='h-[18px] w-[18px] flex-shrink-0 text-gray-600' />
											<span className='flex-1 text-[15px] font-normal text-gray-600'>
												{formatEntitlementValue({
													type: entitlement.type,
													value: entitlement.value,
													name: entitlement.name,
													usage_reset_period: entitlement.usage_reset_period || '',
													feature_id: entitlement.feature_id,
												})}
											</span>
											{entitlement.description && (
												<TooltipProvider delayDuration={0}>
													<Tooltip>
														<TooltipTrigger className='cursor-pointer'>
															<Info className='h-4 w-4 text-gray-400 transition-colors duration-150 hover:text-gray-500' />
														</TooltipTrigger>
														<TooltipContent sideOffset={5} className='max-w-[200px] rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white'>
															{entitlement.description}
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											)}
										</li>
									);
								})}
								{!showAllEntitlements && hiddenEntitlementsCount > 0 && (
									<li>
										<TooltipProvider delayDuration={0}>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type='button'
														onClick={() => setShowAllEntitlements(true)}
														className='flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors'>
														<Eye className='h-3.5 w-3.5' />+{hiddenEntitlementsCount} more
													</button>
												</TooltipTrigger>
												<TooltipContent
													sideOffset={5}
													className='bg-white border border-gray-200 shadow-lg text-sm text-gray-900 px-4 py-3 rounded-lg max-w-[280px]'>
													<div className='space-y-2'>
														{entitlements.slice(VISIBLE_LIMIT).map((ent, i) => (
															<div key={i} className='flex items-start gap-2 text-sm text-gray-600'>
																<Check className='h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0' />
																<span>
																	{formatEntitlementValue({
																		type: ent.type,
																		value: ent.value,
																		name: ent.name,
																		usage_reset_period: ent.usage_reset_period || '',
																		feature_id: '',
																	})}
																</span>
															</div>
														))}
													</div>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</li>
								)}
								{showAllEntitlements && entitlements.length > VISIBLE_LIMIT && (
									<li>
										<button
											type='button'
											onClick={() => setShowAllEntitlements(false)}
											className='flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors'>
											Show less
										</button>
									</li>
								)}
							</ul>
						</>
					) : (
						<div className='text-center'>
							<button
								onClick={() => navigate(`${RouteNames.plan}/${id}`)}
								className='text-sm text-gray-900 underline decoration-dashed decoration-[0.5px] decoration-muted-foreground/50 underline-offset-4 hover:text-gray-700 transition-colors'>
								Add entitlements
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default PricingCard;
