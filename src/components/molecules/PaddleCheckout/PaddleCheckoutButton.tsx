import { Button } from '@/components/ui';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import type { PaddleCheckoutItem, PaddleCheckoutCustomer } from '@/core/paddle/types';

export interface PaddleCheckoutButtonProps {
	items: PaddleCheckoutItem[];
	customer?: PaddleCheckoutCustomer;
	discountCode?: string;
	successUrl?: string;
	children?: React.ReactNode;
	className?: string;
	variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

/** Default price IDs from Paddle docs - replace with your own from Paddle dashboard */
export const SAMPLE_PRICE_IDS = {
	proPlan: 'pri_01gsz8ntc6z7npqqp6j4ys0w1w',
	enterprisePlan: 'pri_01h1vjfevh5etwq3rb416a23h2',
} as const;

export const PaddleCheckoutButton = ({
	items,
	customer,
	discountCode,
	successUrl,
	children = 'Sign up now',
	className,
	variant = 'default',
}: PaddleCheckoutButtonProps) => {
	const { openCheckout } = usePaddleCheckout();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		openCheckout({
			items,
			...(customer && { customer }),
			...(discountCode && { discountCode }),
			...(successUrl && {
				settings: { successUrl },
			}),
		});
	};

	return (
		<Button onClick={handleClick} className={className} variant={variant}>
			{children}
		</Button>
	);
};
