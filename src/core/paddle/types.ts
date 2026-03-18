/**
 * Paddle Checkout types for overlay checkout integration
 * See: https://developer.paddle.com/paddlejs/methods/paddle-checkout-open
 */

export interface PaddleCheckoutItem {
	priceId: string;
	quantity?: number;
}

export interface PaddleCheckoutAddress {
	countryCode?: string;
	postalCode?: string;
	region?: string;
	city?: string;
	line1?: string;
}

export interface PaddleCheckoutCustomer {
	email?: string;
	id?: string;
	address?: PaddleCheckoutAddress;
}

export interface PaddleCheckoutSettings {
	displayMode?: 'overlay' | 'inline';
	theme?: 'light' | 'dark' | 'system';
	locale?: string;
	variant?: 'multi-page' | 'one-page';
	successUrl?: string;
	allowLogout?: boolean;
	showAddDiscounts?: boolean;
}

export interface PaddleCheckoutOpenOptions {
	items?: PaddleCheckoutItem[];
	transactionId?: string;
	customer?: PaddleCheckoutCustomer;
	settings?: PaddleCheckoutSettings;
	discountCode?: string;
	discountId?: string;
	customData?: Record<string, unknown>;
}
