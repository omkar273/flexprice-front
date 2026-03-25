import { useState, useCallback, useMemo, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Circle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { SelectOption } from './SearchableSelect';
import type { SearchConfig, ExtractorsConfig, DisplayConfig, OptionsConfig } from './AsyncSearchableSelect';

export interface AsyncMultiSearchableSelectProps<T = any> {
	/** Search configuration */
	search: SearchConfig<T>;
	/** Value extraction configuration */
	extractors: ExtractorsConfig<T>;
	/** Display configuration */
	display?: DisplayConfig;
	/** Options configuration */
	options?: OptionsConfig;
	/** Selected values — full objects */
	value?: T[];
	/** Callback when selection changes */
	onChange?: (value: T[]) => void;
	/** Disabled state */
	disabled?: boolean;
	/**
	 * When true (default), search runs as soon as the popover opens, including with an empty query,
	 * so `searchFn('')` can return default results; typing still refines via the same `searchFn`.
	 * When false, `minSearchLength` gates fetching until the user types enough characters.
	 */
	fetchWhenQueryEmpty?: boolean;
	/**
	 * Minimum trimmed query length before search runs (default: 0, same as single-select fetch-on-open).
	 * Set to 1 or more to defer search until the user types (e.g. customer picker).
	 * Ignored for the fetch gate when `fetchWhenQueryEmpty` is true.
	 */
	minSearchLength?: number;
	/** Shown when `minSearchLength` is not met yet */
	shortQueryHint?: string;
}

const AsyncMultiSearchableSelect = <T = any,>({
	search,
	extractors,
	display = {},
	options = {},
	value = [],
	onChange,
	disabled = false,
	fetchWhenQueryEmpty = true,
	minSearchLength = 0,
	shortQueryHint = 'Type to search…',
}: AsyncMultiSearchableSelectProps<T>) => {
	const { searchFn, debounceTime = 300, placeholder: searchPlaceholder = 'Search...', initialOptions = [] } = search;

	const { valueExtractor, labelExtractor, descriptionExtractor } = extractors;

	const {
		placeholder = 'Select an option',
		label = '',
		description,
		error,
		className,
		trigger,
		defaultOpen = false,
		side = 'top',
		align = 'start',
		sideOffset = 4,
	} = display;

	const { noOptionsText = 'No options found', emptyText = 'No results found.', hideSelectedTick = true, isRadio = false } = options;
	const [open, setOpen] = useState(defaultOpen);
	const [searchQuery, setSearchQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');

	// Debounce the search query
	const debouncedSetQuery = useMemo(
		() =>
			debounce((query: string) => {
				setDebouncedQuery(query);
			}, debounceTime),
		[debounceTime],
	);

	useEffect(() => {
		debouncedSetQuery(searchQuery);
		return () => {
			debouncedSetQuery.cancel();
		};
	}, [searchQuery, debouncedSetQuery]);

	const selectedIdsKey = useMemo(() => [...value.map((v) => valueExtractor(v))].sort().join(','), [value, valueExtractor]);

	const queryMeetsMinLength = minSearchLength === 0 || debouncedQuery.trim().length >= minSearchLength;
	const fetchEnabled = open && (fetchWhenQueryEmpty || queryMeetsMinLength);

	const {
		data: searchResults = [],
		isLoading,
		isError,
		error: queryError,
	} = useQuery<Array<SelectOption & { data: T }>>({
		queryKey: ['async-multi-searchable-select', debouncedQuery, selectedIdsKey, minSearchLength, fetchWhenQueryEmpty],
		queryFn: () => searchFn(debouncedQuery),
		enabled: fetchEnabled,
		staleTime: 30000, // Cache for 30 seconds
	});

	// Create data mapping from search results
	const optionDataMap = useMemo(() => {
		const map = new Map<string, T>();
		searchResults.forEach((item) => {
			map.set(item.value, item.data);
		});
		return map;
	}, [searchResults]);

	const queryTooShortForList = !fetchWhenQueryEmpty && minSearchLength > 0 && debouncedQuery.trim().length < minSearchLength;

	// Extract SelectOptions for display (aligned with AsyncSearchableSelect)
	const availableOptions: SelectOption[] = queryTooShortForList
		? []
		: initialOptions.length > 0 && debouncedQuery === ''
			? initialOptions
			: searchResults.map((item) => ({
					value: item.value,
					label: item.label,
					description: item.description,
					disabled: item.disabled,
					prefixIcon: item.prefixIcon,
					suffixIcon: item.suffixIcon,
				}));

	const selectedIdSet = useMemo(() => new Set(value.map((v) => valueExtractor(v))), [value, valueExtractor]);

	// First selected — for default trigger label parity with single-select
	const primarySelected = value[0];
	const selectedOption =
		value.length === 1 && primarySelected
			? {
					value: valueExtractor(primarySelected),
					label: labelExtractor(primarySelected),
					description: descriptionExtractor?.(primarySelected),
				}
			: undefined;

	const handleOpenChange = useCallback((newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			setSearchQuery('');
		}
	}, []);

	const handleSelect = useCallback(
		(optionValue: string) => {
			if (!onChange) return;

			const selectedObject = optionDataMap.get(optionValue) || value.find((v) => valueExtractor(v) === optionValue);

			if (!selectedObject) return;

			const isSelected = selectedIdSet.has(optionValue);

			if (isRadio) {
				onChange(isSelected && value.length === 1 && valueExtractor(value[0]) === optionValue ? [] : [selectedObject]);
			} else if (isSelected) {
				onChange(value.filter((v) => valueExtractor(v) !== optionValue));
			} else {
				onChange([...value, selectedObject]);
			}

			// Multi-select: keep popover open (single-select closes here)
			setSearchQuery('');
		},
		[onChange, optionDataMap, value, valueExtractor, selectedIdSet, isRadio],
	);

	const renderRadioOption = (option: SelectOption) => {
		const isSelected = selectedIdSet.has(option.value);
		return (
			<CommandItem
				key={option.value}
				value={`${option.label} ${option.description || ''}`}
				onSelect={() => handleSelect(option.value)}
				disabled={option.disabled}
				className={cn(
					'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
					'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
					option.disabled && 'select-none cursor-not-allowed',
				)}>
				<span className='absolute left-2 top-[10px] flex h-4 w-4 justify-center'>
					{isSelected ? <Circle className='size-2 text-black fill-current' /> : null}
					<Circle className='size-4 text-gray-400 absolute' />
				</span>

				<div className='flex items-center space-x-2 w-full'>
					<div className='flex flex-col mr-2 w-full'>
						<span className='break-words'>{option.label}</span>
						{option.description && <span className='text-sm text-gray-500 break-words whitespace-normal'>{option.description}</span>}
					</div>
				</div>
			</CommandItem>
		);
	};

	const renderStandardOption = (option: SelectOption) => {
		const isSelected = selectedIdSet.has(option.value);
		return (
			<CommandItem
				key={option.value}
				value={`${option.label} ${option.description || ''}`}
				onSelect={() => handleSelect(option.value)}
				disabled={option.disabled}
				className={cn(
					'cursor-pointer flex items-center space-x-2 justify-between w-full',
					option.disabled && 'select-none cursor-not-allowed opacity-50',
				)}>
				<div
					className={cn(
						'flex w-full items-center space-x-2 justify-between',
						option.disabled && 'opacity-50 pointer-events-none',
						option.suffixIcon && 'pr-8',
						hideSelectedTick && '!pl-0',
					)}>
					{option.prefixIcon && option.prefixIcon}

					<div className={cn('flex flex-col w-full', !hideSelectedTick && 'mr-0')}>
						<span className='break-words'>{option.label}</span>
						{option.description && <span className='text-sm text-gray-500 break-words whitespace-normal'>{option.description}</span>}
					</div>

					<div className='flex items-center gap-2'>
						{option.suffixIcon && <span>{option.suffixIcon}</span>}
						{!hideSelectedTick && <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />}
					</div>
				</div>
			</CommandItem>
		);
	};

	const displayText =
		value.length === 0 ? placeholder : value.length === 1 ? (selectedOption?.label ?? placeholder) : `${value.length} selected`;

	const listBody = queryTooShortForList ? (
		<div className='px-3 py-2 text-sm text-muted-foreground'>{shortQueryHint}</div>
	) : (
		<>
			{isLoading && (
				<div className='flex items-center justify-center py-6'>
					<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
					<span className='ml-2 text-sm text-muted-foreground'>Searching...</span>
				</div>
			)}
			{isError && (
				<CommandEmpty>
					<div className='text-sm text-destructive'>{queryError instanceof Error ? queryError.message : 'Error loading options'}</div>
				</CommandEmpty>
			)}
			{!isLoading && !isError && (
				<>
					<CommandEmpty>{emptyText}</CommandEmpty>
					<CommandGroup>
						{availableOptions.length > 0 ? (
							availableOptions.map((option) => (isRadio ? renderRadioOption(option) : renderStandardOption(option)))
						) : (
							<CommandItem disabled>
								<div className='flex items-center space-x-2 w-full'>
									<div className='flex flex-col mr-2 w-full'>
										<span className='break-words'>{noOptionsText}</span>
									</div>
								</div>
							</CommandItem>
						)}
					</CommandGroup>
				</>
			)}
		</>
	);

	return (
		<div className={cn('space-y-1')}>
			{/* Label */}
			{label && (
				<label className={cn(' block text-sm font-medium text-zinc break-words', disabled ? 'text-zinc-500' : 'text-zinc-950')}>
					{label}
				</label>
			)}

			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>
					<button
						className={cn(
							'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
							'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
							'disabled:cursor-not-allowed disabled:opacity-50',
							disabled && 'cursor-not-allowed',
							className,
						)}
						disabled={disabled}
						type='button'>
						{trigger ? (
							trigger
						) : (
							<>
								<span className={cn('truncate', value.length > 0 ? '' : 'text-muted-foreground')}>{displayText}</span>
								<ChevronDown className='h-4 w-4 opacity-50' />
							</>
						)}
					</button>
				</PopoverTrigger>
				<PopoverContent
					className='w-[var(--radix-popover-trigger-width)] p-0'
					align={align}
					side={side}
					sideOffset={sideOffset}
					avoidCollisions={true}
					collisionPadding={8}
					onOpenAutoFocus={(e) => e.preventDefault()}>
					<Command shouldFilter={false}>
						<CommandInput placeholder={searchPlaceholder} value={searchQuery} onValueChange={setSearchQuery} className='h-9' />
						<CommandList
							className='max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
							onWheel={(e) => e.stopPropagation()}
							onScroll={(e) => e.stopPropagation()}>
							{listBody}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{/* Description */}
			{description && <p className='text-sm text-muted-foreground break-words'>{description}</p>}

			{/* Error Message */}
			{error && <p className='text-sm text-destructive break-words'>{error}</p>}
		</div>
	);
};

export default AsyncMultiSearchableSelect;
