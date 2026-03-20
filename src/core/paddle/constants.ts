/**
 * Paddle checkout URL params.
 *
 * Checkout URL format:
 *   /checkout?_ptxn=txn_xxx&token=eyJ...
 *
 * - _ptxn: Paddle's native transaction ID param (returned by Paddle API in checkout.url)
 * - token: Backend-signed JWT containing { client_side_token, success_url, exp }
 * - _pca:  Optional customer auth token (enables saved payment methods)
 */
export const PADDLE_URL_PARAMS = {
	TXN: '_ptxn',
	TOKEN: 'token',
	CUSTOMER_AUTH: '_pca',
} as const;

export const CHECKOUT_PATH = '/checkout';
