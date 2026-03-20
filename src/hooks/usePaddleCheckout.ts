import { useCallback } from 'react';
import type { PaddleCheckoutOpenOptions } from '@/core/paddle';

export const usePaddleCheckout = () => {
	const openCheckout = useCallback((options: PaddleCheckoutOpenOptions) => {
		const Paddle = window.Paddle;
		if (!Paddle?.Checkout) {
			console.error('[Paddle] Not initialized. Ensure PaddleProvider wraps your app.');
			return;
		}

		const { items, transactionId, customer, settings, discountCode, discountId, customerAuthToken } = options;

		if (!items?.length && !transactionId) {
			console.error('[Paddle] Requires items or transactionId');
			return;
		}

		const checkoutSettings = settings ? { displayMode: 'overlay' as const, ...settings } : { displayMode: 'overlay' as const };

		Paddle.Checkout.open({
			...(items?.length && { items }),
			...(transactionId && { transactionId }),
			...(customer && { customer }),
			...(customerAuthToken && { customerAuthToken }),
			settings: checkoutSettings,
			...(discountCode && { discountCode }),
			...(discountId && { discountId }),
		});
	}, []);

	return { openCheckout };
};
