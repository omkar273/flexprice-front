import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import CustomerPortalApi from '@/api/CustomerPortalApi';
import { Card } from '@/components/atoms';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/molecules/Table/Table';
import { UsageAnalyticItem } from '@/models';
import { DashboardAnalyticsRequest } from '@/types';
import { formatNumber, getCurrencySymbol } from '@/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHEVRON_UP_SVG = '/assets/svg/chevron-up-svgrepo-com.svg';
const CHEVRON_DOWN_SVG = '/assets/svg/chevron-down-svgrepo-com.svg';
const EXPAND_ALL_SVG = '/assets/svg/expand-all-svgrepo-com.svg';
const COLLAPSE_ALL_SVG = '/assets/svg/collapse-all-svgrepo-com.svg';

interface UsageBreakdownWidgetProps {
	analyticsParams: DashboardAnalyticsRequest;
	label?: string;
}

const UNGROUPED_KEY = '__ungrouped__';

interface GroupBucket {
	groupKey: string;
	groupName: string;
	items: UsageAnalyticItem[];
}

function renderTotalUsagePortal(row: UsageAnalyticItem) {
	const useDisplayValue = row.total_usage_display !== '' && row.total_usage_display != null;
	const displayNum = useDisplayValue
		? Number(parseFloat((row.total_usage_display || '0').replace(/,/g, '')))
		: Number(row.total_usage) || 0;
	const isSingular = displayNum === 1;
	const unitLabel = row.reporting_unit
		? isSingular
			? (row.reporting_unit.unit_singular ?? row.reporting_unit.unit_plural ?? '')
			: (row.reporting_unit.unit_plural ?? row.reporting_unit.unit_singular ?? '')
		: row.unit
			? Number(row.total_usage) === 1
				? row.unit
				: (row.unit_plural ?? row.unit)
			: '';
	const suffix = unitLabel ? ` ${unitLabel}` : '';
	return (
		<span>
			{useDisplayValue ? row.total_usage_display : formatNumber(Number(row.total_usage))}
			{suffix}
		</span>
	);
}

function renderTotalCostPortal(row: UsageAnalyticItem) {
	const cost = Number(row.total_cost);
	if (cost === 0 || !row.currency) return '-';
	const currency = getCurrencySymbol(row.currency);
	return (
		<span>
			{currency}
			{formatNumber(cost, 2)}
		</span>
	);
}

/**
 * Renders just the usage breakdown table with grouping support.
 * Shares React Query cache with UsageGraphWidget (same key) — zero duplicate API calls.
 * Returns null if there are no items — no empty container shown.
 */
const UsageBreakdownWidget = ({ analyticsParams, label }: UsageBreakdownWidgetProps) => {
	const {
		data: analyticsData,
		isLoading,
		isError,
	} = useQuery({
		queryKey: ['portal-analytics', analyticsParams],
		queryFn: () => CustomerPortalApi.getAnalytics(analyticsParams),
	});

	useEffect(() => {
		if (isError) toast.error('Failed to load usage breakdown');
	}, [isError]);

	const items = analyticsData?.items ?? [];

	// Sort state
	const [sortField, setSortField] = useState<'total_usage' | 'total_cost'>('total_cost');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
	const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
	const hasInitializedExpand = useRef(false);

	const sortedItems = useMemo(() => {
		const sorted = [...items];
		const mult = sortDirection === 'asc' ? 1 : -1;
		sorted.sort((a, b) => {
			const va = sortField === 'total_usage' ? Number(a.total_usage) : Number(a.total_cost);
			const vb = sortField === 'total_usage' ? Number(b.total_usage) : Number(b.total_cost);
			return (va - vb) * mult;
		});
		return sorted;
	}, [items, sortDirection, sortField]);

	const { groupedBuckets, ungroupedItems } = useMemo(() => {
		const map = new Map<string, GroupBucket>();
		for (const item of sortedItems) {
			const group = item.price?.group;
			const groupKey = group?.id ?? UNGROUPED_KEY;
			const groupName = group?.name ?? 'No group';
			if (!map.has(groupKey)) map.set(groupKey, { groupKey, groupName, items: [] });
			map.get(groupKey)!.items.push(item);
		}
		const ungrouped = map.get(UNGROUPED_KEY)?.items ?? [];
		const grouped = Array.from(map.values())
			.filter((b) => b.groupKey !== UNGROUPED_KEY)
			.sort((a, b) => a.groupName.localeCompare(b.groupName));
		return { groupedBuckets: grouped, ungroupedItems: ungrouped };
	}, [sortedItems]);

	useEffect(() => {
		if (groupedBuckets.length > 0 && !hasInitializedExpand.current) {
			hasInitializedExpand.current = true;
			setExpandedGroupIds(new Set(groupedBuckets.map((b) => b.groupKey)));
		}
	}, [groupedBuckets]);

	const hasGroups = groupedBuckets.length > 0;
	const allExpanded = hasGroups && groupedBuckets.every((b) => expandedGroupIds.has(b.groupKey));
	const toggleExpandAll = () => {
		setExpandedGroupIds(allExpanded ? new Set() : new Set(groupedBuckets.map((b) => b.groupKey)));
	};
	const toggleGroup = (groupKey: string) => {
		setExpandedGroupIds((prev) => {
			const next = new Set(prev);
			if (next.has(groupKey)) next.delete(groupKey);
			else next.add(groupKey);
			return next;
		});
	};

	const renderSortableHeader = (field: 'total_usage' | 'total_cost', label: string) => {
		const isActive = sortField === field;
		return (
			<button
				type='button'
				className={cn(
					'group -ml-1 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-left transition-colors',
					isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
				)}
				onClick={() => {
					if (sortField !== field) {
						setSortField(field);
						setSortDirection('desc');
					} else {
						setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
					}
				}}>
				<span className='leading-none'>{label}</span>
				{sortDirection === 'asc' && isActive ? (
					<ChevronUp className='h-3.5 w-3.5 shrink-0 text-gray-900' />
				) : isActive ? (
					<ChevronDown className='h-3.5 w-3.5 shrink-0 text-gray-900' />
				) : (
					<ChevronsUpDown className='h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-500' />
				)}
			</button>
		);
	};

	// Return null if no data — no empty state container
	if (!isLoading && items.length === 0) return null;

	if (isLoading) {
		return (
			<Card className='bg-white border border-[#E9E9E9] rounded-xl overflow-hidden'>
				<div className='p-6 border-b border-[#E9E9E9]'>
					<div className='h-5 w-40 bg-zinc-100 animate-pulse rounded' />
				</div>
				<div className='p-6 space-y-3'>
					{[1, 2, 3].map((i) => (
						<div key={i} className='h-8 bg-zinc-100 animate-pulse rounded' />
					))}
				</div>
			</Card>
		);
	}

	return (
		<Card className='bg-white border border-[#E9E9E9] rounded-xl overflow-hidden'>
			<div className='p-6'>
				<div className='flex items-center justify-between'>
					<h3 className='text-base font-medium text-zinc-950'>{label || 'Usage Breakdown'}</h3>
					{hasGroups && (
						<button
							type='button'
							onClick={toggleExpandAll}
							className='inline-flex items-center justify-center text-gray-600 hover:text-gray-900'
							aria-label={allExpanded ? 'Collapse all' : 'Expand all'}>
							<img src={allExpanded ? COLLAPSE_ALL_SVG : EXPAND_ALL_SVG} alt='' className='h-4 w-4' />
						</button>
					)}
				</div>
			</div>

			<div className='px-6 pb-6'>
				<Table>
					<TableHeader className='h-10 border-b border-gray-200'>
						<TableRow className='border-b border-gray-200'>
							<TableHead className='pl-0 font-semibold text-gray-700 text-[13px]'>Feature</TableHead>
							<TableHead className='font-semibold text-gray-700 text-[13px]'>
								{renderSortableHeader('total_usage', 'Total Usage')}
							</TableHead>
							<TableHead className='font-semibold text-gray-700 text-[13px]'>{renderSortableHeader('total_cost', 'Total Cost')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{groupedBuckets.map((bucket) => {
							const isExpanded = expandedGroupIds.has(bucket.groupKey);
							const aggregateCost = bucket.items.reduce((s, i) => s + Number(i.total_cost), 0);
							const firstCurrency = bucket.items[0]?.currency;
							return (
								<React.Fragment key={bucket.groupKey}>
									<TableRow
										role='button'
										tabIndex={0}
										onClick={() => bucket.items.length > 0 && toggleGroup(bucket.groupKey)}
										onKeyDown={(e) => {
											if ((e.key === 'Enter' || e.key === ' ') && bucket.items.length > 0) {
												e.preventDefault();
												toggleGroup(bucket.groupKey);
											}
										}}
										className={cn(
											'h-10 align-middle border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50/50',
											bucket.items.length === 0 && 'border-b-0',
											bucket.items.length === 0 && 'cursor-default',
										)}>
										<TableCell className='pl-0 py-2.5 align-middle'>
											<div className='inline-flex items-center gap-2 text-left'>
												<span className='font-semibold text-gray-900 text-[13px]'>{bucket.groupName}</span>
												{bucket.items.length > 0 ? (
													<img
														src={isExpanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG}
														alt=''
														className='h-4 w-4 shrink-0 text-gray-600'
														aria-hidden
													/>
												) : null}
											</div>
										</TableCell>
										<TableCell className='py-2.5 font-normal text-gray-700 text-[13px]'>—</TableCell>
										<TableCell className='py-2.5 font-normal text-gray-600 text-[13px]'>
											{firstCurrency ? (
												<>
													{getCurrencySymbol(firstCurrency)}
													{formatNumber(aggregateCost, 2)}
												</>
											) : (
												'—'
											)}
										</TableCell>
									</TableRow>
									{isExpanded &&
										bucket.items.map((row, childIndex) => (
											<TableRow
												key={`${bucket.groupKey}:${row.feature_id ?? row.price_id ?? row.meter_id ?? childIndex}`}
												className='h-10 align-middle border-b border-gray-200 bg-white hover:bg-gray-50/50'>
												<TableCell className='py-2.5 pl-0 font-normal text-gray-700 text-[13px] align-middle'>
													<span>{row.name || row.feature?.name || row.event_name || 'Unknown'}</span>
												</TableCell>
												<TableCell className='py-2.5 font-normal text-gray-600 text-[13px]'>{renderTotalUsagePortal(row)}</TableCell>
												<TableCell className='py-2.5 font-normal text-gray-600 text-[13px]'>{renderTotalCostPortal(row)}</TableCell>
											</TableRow>
										))}
								</React.Fragment>
							);
						})}
						{ungroupedItems.map((row, index) => (
							<TableRow
								key={`ungrouped:${row.feature_id ?? row.price_id ?? row.meter_id ?? index}`}
								className='h-10 align-middle border-b border-gray-200 bg-white hover:bg-gray-50/50'>
								<TableCell className='pl-0 py-2.5 font-normal text-gray-700 text-[13px]'>
									<span>{row.name || row.feature?.name || row.event_name || 'Unknown'}</span>
								</TableCell>
								<TableCell className='py-2.5 font-normal text-gray-600 text-[13px]'>{renderTotalUsagePortal(row)}</TableCell>
								<TableCell className='py-2.5 font-normal text-gray-600 text-[13px]'>{renderTotalCostPortal(row)}</TableCell>
							</TableRow>
						))}
						{items.length === 0 && (
							<TableRow className='bg-white'>
								<TableCell colSpan={3} className='pl-0 py-4 font-normal text-gray-500 text-[13px]'>
									--
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</Card>
	);
};

export default UsageBreakdownWidget;
