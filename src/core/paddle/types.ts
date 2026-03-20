/**
 * Paddle Checkout types for overlay checkout integration
 * See: https://developer.paddle.com/paddlejs/methods/paddle-checkout-open
 */

/**
 * Decoded payload from the JWT appended to the checkout URL as ?token=eyJ...
 * The backend signs this after syncing an invoice to Paddle.
 * Frontend decodes client-side (base64 only — no signature verification needed,
 * since client_side_token is a Paddle public token, safe in the browser).
 */
export interface CheckoutTokenPayload {
	client_side_token: string;
	success_url: string;
	iat?: number;
	exp?: number;
}

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
	customerAuthToken?: string;
	settings?: PaddleCheckoutSettings;
	discountCode?: string;
	discountId?: string;
}
