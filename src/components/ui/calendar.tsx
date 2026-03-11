import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CalendarTimezone = 'local' | 'utc';

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
	timezone?: CalendarTimezone;
	onTimezoneChange?: (tz: CalendarTimezone) => void;
};

function Calendar({ className, classNames, showOutsideDays = true, timezone, onTimezoneChange, ...props }: CalendarProps) {
	const showTimezone = timezone !== undefined || onTimezoneChange !== undefined;
	const currentTz = timezone ?? 'local';
	const isInteractive = onTimezoneChange !== undefined;

	return (
		<div className='flex flex-col'>
			<DayPicker
				showOutsideDays={showOutsideDays}
				className={cn('p-3', className)}
				classNames={{
					months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
					month: 'space-y-4',
					caption: 'flex justify-center pt-1 relative items-center',
					caption_label: 'text-sm font-medium',
					nav: 'space-x-1 flex items-center',
					nav_button: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'),
					nav_button_previous: 'absolute left-1',
					nav_button_next: 'absolute right-1',
					table: 'w-full border-collapse space-y-1',
					head_row: 'flex',
					head_cell: 'text-muted-foreground rounded-[6px] w-8 font-normal text-[0.8rem]',
					row: 'flex w-full mt-2',
					cell: cn(
						'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-[6px]',
						props.mode === 'range'
							? '[&:has(>.day-range-end)]:rounded-r-[6px] [&:has(>.day-range-start)]:rounded-l-[6px] first:[&:has([aria-selected])]:rounded-l-[6px] last:[&:has([aria-selected])]:rounded-r-[6px]'
							: '[&:has([aria-selected])]:rounded-[6px]',
					),
					day: cn(buttonVariants({ variant: 'ghost' }), 'h-8 w-8 p-0 font-normal aria-selected:opacity-100'),
					day_range_start: 'day-range-start',
					day_range_end: 'day-range-end',
					day_selected:
						'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
					day_today: 'bg-accent text-accent-foreground',
					day_outside: 'day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
					day_disabled: 'text-muted-foreground opacity-50',
					day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
					day_hidden: 'invisible',
					...classNames,
				}}
				components={{
					IconLeft: ({ className, ...iconProps }) => <ChevronLeft className={cn('h-4 w-4', className)} {...iconProps} />,
					IconRight: ({ className, ...iconProps }) => <ChevronRight className={cn('h-4 w-4', className)} {...iconProps} />,
				}}
				{...props}
			/>
			{showTimezone && (
				<div className='mt-3 pt-3 border-t border-border px-3 pb-2.5' role='group' aria-label='Timezone'>
					<div className='flex items-center justify-between gap-3'>
						<span className='text-xs text-muted-foreground font-normal'>Timezone</span>
						{isInteractive ? (
							<Select value={currentTz} onValueChange={(value) => onTimezoneChange(value as CalendarTimezone)}>
								<SelectTrigger className='h-8 min-w-[84px] w-[84px] border-border bg-background px-2.5 text-xs font-normal shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-1 [&>svg]:h-3.5 [&>svg]:w-3.5'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent align='end' side='top' className='z-[70]'>
									<SelectItem value='local' className='text-xs'>
										Local
									</SelectItem>
									<SelectItem value='utc' className='text-xs'>
										UTC
									</SelectItem>
								</SelectContent>
							</Select>
						) : (
							<span className='text-xs text-foreground font-medium'>{currentTz === 'local' ? 'Local' : 'UTC'}</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
Calendar.displayName = 'Calendar';

export { Calendar };
