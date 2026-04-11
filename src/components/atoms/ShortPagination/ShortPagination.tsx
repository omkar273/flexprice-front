import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import usePagination, { PAGINATION_PREFIX } from '@/hooks/usePagination';

interface ShortPaginationProps {
	totalItems: number; // Changed to required
	pageSize?: number;
	showPages?: boolean;
	unit?: string;
	prefix?: PAGINATION_PREFIX | string;
}

const ShortPagination = ({
	totalItems,
	pageSize,
	unit = 'items',
	showPages = false,
	prefix,
	// Keep these for backward compatibility
}: ShortPaginationProps) => {
	const { page, setPage, limit } = usePagination({
		initialLimit: pageSize,
		prefix,
	});

	// Use limit from hook if pageSize not provided, otherwise use pageSize
	const effectivePageSize = pageSize || limit;

	// Calculate actual total pages from totalItems and effectivePageSize
	const calculatedTotalPages = Math.ceil(totalItems / effectivePageSize);
	// Use calculated pages, fall back to provided total pages for backward compatibility. When on page > 1, ensure at least that many pages so Previous stays available.
	const totalPages = Math.max(calculatedTotalPages || 1, page);

	const handlePageChange = (newPage: number) => {
		if (newPage < 1 || newPage > totalPages) return;
		setPage(newPage);
	};

	// Hide only when single page and we're on page 1 (show when page > 1 so user can go back)
	if (totalPages <= 1 && page <= 1) return null;

	const startItem = (page - 1) * effectivePageSize + 1;
	const endItem = Math.min(page * effectivePageSize, totalItems);

	return (
		<div className='flex items-center justify-between py-4'>
			<div className='text-sm text-gray-500 font-light'>
				Showing <span className='font-normal'>{startItem}</span> to <span className='font-normal'>{endItem}</span> of{' '}
				<span className='font-normal'>{totalItems}</span> {unit}
			</div>
			<div className='flex items-center space-x-2'>
				<Button
					type='button'
					variant='outline'
					size='icon'
					onClick={() => handlePageChange(page - 1)}
					disabled={page === 1}
					className={cn('size-8', page === 1 && 'text-gray-300 cursor-not-allowed')}>
					<ChevronLeft className='h-4 w-4' />
				</Button>
				{showPages && (
					<div className='text-sm font-light text-gray-500'>
						Page {page} of {totalPages}
					</div>
				)}
				<Button
					type='button'
					variant='outline'
					size='icon'
					onClick={() => handlePageChange(page + 1)}
					disabled={page === totalPages}
					className={cn('size-8', page === totalPages && 'text-gray-300 cursor-not-allowed')}>
					<ChevronRight className='h-4 w-4' />
				</Button>
			</div>
		</div>
	);
};

export default ShortPagination;
