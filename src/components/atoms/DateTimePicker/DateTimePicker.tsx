'use client';

import * as React from 'react';
import { CalendarIcon } from '@radix-ui/react-icons';

import { cn } from '@/lib/utils';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, ScrollArea, ScrollBar } from '@/components/ui';
import type { CalendarTimezone } from '@/components/ui/calendar';
import {
	formatDateTimeInZone,
	getCalendarDayInZone,
	getTimeInZone,
	dateTimeInZone,
	convertDateTimeToTimezone,
	toCalendarDisplayDate,
	type DateTimezone,
} from '@/utils/common/format_date';

interface Props {
	date?: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	title?: string;
}

export const DateTimePicker: React.FC<Props> = ({ date, setDate, disabled, placeholder, title }) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const [timezone, setTimezone] = React.useState<CalendarTimezone>('local');

	const hours = Array.from({ length: 12 }, (_, i) => i + 1);
	const tz = timezone as DateTimezone;

	const handleDateSelect = React.useCallback(
		(selectedDate: Date | undefined) => {
			if (!selectedDate) return;
			const y = selectedDate.getFullYear();
			const mo = selectedDate.getMonth();
			const d = selectedDate.getDate();
			if (date) {
				const { hours: h, minutes: m, seconds: s } = getTimeInZone(date, tz);
				setDate(dateTimeInZone(y, mo, d, h, m, s, tz));
			} else {
				setDate(dateTimeInZone(y, mo, d, 0, 0, 0, tz));
			}
		},
		[date, tz, setDate],
	);

	const handleTimeChange = React.useCallback(
		(type: 'hour' | 'minute' | 'ampm', value: string) => {
			if (!date) return;
			const { year, month, date: d } = getCalendarDayInZone(date, tz);
			const { hours: initialH, minutes: initialM, seconds: s } = getTimeInZone(date, tz);
			let h = initialH;
			let m = initialM;
			if (type === 'hour') {
				const hour = parseInt(value, 10);
				const isPM = h >= 12;
				h = isPM ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
			} else if (type === 'minute') {
				m = parseInt(value, 10);
			} else if (type === 'ampm') {
				const currentHours = h % 12;
				h = value === 'PM' ? currentHours + 12 : currentHours;
			}
			setDate(dateTimeInZone(year, month, d, h, m, s, tz));
		},
		[date, tz, setDate],
	);

	const handleTimezoneChange = React.useCallback(
		(newTz: CalendarTimezone) => {
			if (date) {
				setDate(convertDateTimeToTimezone(date, tz, newTz as DateTimezone));
			}
			setTimezone(newTz);
		},
		[date, tz, setDate],
	);

	const displayDate = date ? toCalendarDisplayDate(date, tz) : undefined;
	const displayLabel = date ? formatDateTimeInZone(date, tz) : (placeholder ?? 'MM/DD/YYYY hh:mm aa');
	const timeInZone = date ? getTimeInZone(date, tz) : null;

	return (
		<div className='space-y-1'>
			{title && <div className='text-sm font-medium text-zinc-950'>{title}</div>}
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant='outline'
						className={cn(
							'w-full justify-start text-left font-normal h-10',
							date && 'border-primary-foreground',
							disabled && 'bg-gray-100',
							!date && 'text-muted-foreground',
						)}
						disabled={disabled}>
						<CalendarIcon className='mr-2 h-4 w-4' />
						{date ? displayLabel : <span>{placeholder ?? 'MM/DD/YYYY hh:mm aa'}</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0'>
					<div className='sm:flex'>
						<Calendar
							mode='single'
							selected={displayDate}
							onSelect={handleDateSelect}
							initialFocus
							timezone={timezone}
							onTimezoneChange={handleTimezoneChange}
						/>
						<div className='flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x'>
							<ScrollArea className='w-64 sm:w-auto'>
								<div className='flex sm:flex-col p-2'>
									{hours.reverse().map((hour) => (
										<Button
											key={hour}
											size='icon'
											variant={timeInZone && timeInZone.hours % 12 === hour % 12 ? 'default' : 'ghost'}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('hour', hour.toString())}>
											{hour}
										</Button>
									))}
								</div>
								<ScrollBar orientation='horizontal' className='sm:hidden' />
							</ScrollArea>
							<ScrollArea className='w-64 sm:w-auto'>
								<div className='flex sm:flex-col p-2'>
									{Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
										<Button
											key={minute}
											size='icon'
											variant={timeInZone && timeInZone.minutes === minute ? 'default' : 'ghost'}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('minute', minute.toString())}>
											{minute}
										</Button>
									))}
								</div>
								<ScrollBar orientation='horizontal' className='sm:hidden' />
							</ScrollArea>
							<ScrollArea>
								<div className='flex sm:flex-col p-2'>
									{['AM', 'PM'].map((ampm) => (
										<Button
											key={ampm}
											size='icon'
											variant={
												timeInZone && ((ampm === 'AM' && timeInZone.hours < 12) || (ampm === 'PM' && timeInZone.hours >= 12))
													? 'default'
													: 'ghost'
											}
											className='sm:w-full shrink-0 aspect-square'
											onClick={() => handleTimeChange('ampm', ampm)}>
											{ampm}
										</Button>
									))}
								</div>
							</ScrollArea>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
};

export default DateTimePicker;
