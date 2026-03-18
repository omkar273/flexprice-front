import { useCallback } from 'react';
import type { PaddleCheckoutOpenOptions } from '@/core/paddle/types';

export const usePaddleCheckout = () => {
	const openCheckout = useCallback((options: PaddleCheckoutOpenOptions) => {
		const Paddle = window.Paddle;
		if (!Paddle?.Checkout) {
			console.error('Paddle.js not initialized. Ensure PaddleProvider wraps your app.');
			return;
		}

		const { items, transactionId, customer, settings, discountCode, discountId } = options;

		if (!items?.length && !transactionId) {
			console.error('Paddle.Checkout.open requires either items or transactionId');
			return;
		}

		Paddle.Checkout.open({
			...(items?.length && { items }),
			...(transactionId && { transactionId }),
			...(customer && { customer }),
			...(settings && { settings: { ...settings, displayMode: settings.displayMode ?? 'overlay' } }),
			...(discountCode && { discountCode }),
			...(discountId && { discountId }),
		});
	}, []);

	return { openCheckout };
};
