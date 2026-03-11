'use client';

import { useCallback, useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { CalendarTimezone } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	formatDateInZone,
	startOfDayInZone,
	convertDateToTimezone,
	toCalendarDisplayDate,
	type DateTimezone,
} from '@/utils/common/format_date';

interface DatePickerProps {
	date: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	label?: string;
	minDate?: Date;
	maxDate?: Date;
	className?: string;
	labelClassName?: string;
	popoverClassName?: string;
	popoverTriggerClassName?: string;
	popoverContentClassName?: string;
}

const DatePicker = ({
	date,
	setDate,
	placeholder = 'Pick a date',
	disabled = false,
	label,
	minDate,
	maxDate,
	className,
	labelClassName,
	popoverClassName,
	popoverTriggerClassName,
	popoverContentClassName,
}: DatePickerProps) => {
	const [open, setOpen] = useState(false);
	const [timezone, setTimezone] = useState<CalendarTimezone>('local');

	const handleSelect = useCallback(
		(selected: Date | undefined) => {
			if (!selected) {
				setDate(undefined);
				setOpen(false);
				return;
			}
			const value =
				timezone === 'utc' ? startOfDayInZone(selected.getFullYear(), selected.getMonth(), selected.getDate(), 'utc') : selected;
			setDate(value);
			setOpen(false);
		},
		[setDate, timezone],
	);

	const handleTimezoneChange = useCallback(
		(newTz: CalendarTimezone) => {
			if (date) {
				const converted = convertDateToTimezone(date, timezone as DateTimezone, newTz as DateTimezone);
				setDate(converted);
			}
			setTimezone(newTz);
		},
		[date, timezone, setDate],
	);

	const displayDate = date ? toCalendarDisplayDate(date, timezone as DateTimezone) : undefined;
	const displayLabel = date ? formatDateInZone(date, timezone as DateTimezone) : placeholder;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger className={popoverTriggerClassName} disabled={disabled}>
				{label && <div className={cn('mb-1 w-full text-start text-sm ', labelClassName)}>{label}</div>}
				<Button
					variant='outline'
					className={cn('min-w-[240px] h-10 justify-start text-left font-normal py-1', !date && 'text-muted-foreground', className)}
					disabled={disabled}>
					<CalendarIcon className='mr-2 h-4 w-4' />
					{displayLabel}
				</Button>
			</PopoverTrigger>
			<PopoverContent className={cn('w-auto p-0 z-[60] pointer-events-auto', popoverClassName, popoverContentClassName)} align='start'>
				<Calendar
					mode='single'
					disabled={disabled}
					selected={displayDate}
					onSelect={handleSelect}
					initialFocus
					fromDate={minDate}
					toDate={maxDate}
					timezone={timezone}
					onTimezoneChange={handleTimezoneChange}
				/>
			</PopoverContent>
		</Popover>
	);
};

export default DatePicker;
