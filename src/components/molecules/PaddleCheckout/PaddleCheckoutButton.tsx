import { Button } from '@/components/ui';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import type { PaddleCheckoutItem, PaddleCheckoutCustomer } from '@/core/paddle';

export interface PaddleCheckoutButtonProps {
	items: PaddleCheckoutItem[];
	customer?: PaddleCheckoutCustomer;
	discountCode?: string;
	successUrl?: string;
	children?: React.ReactNode;
	className?: string;
	variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

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
