import { PADDLE_URL_PARAMS } from './constants';
import type { CheckoutTokenPayload } from './types';

/**
 * Decodes the JWT payload from the checkout URL token param.
 * Base64 decode only — no signature verification needed since
 * client_side_token is a Paddle public token, safe in the browser.
 */
export function decodeCheckoutToken(raw: string): CheckoutTokenPayload | null {
	try {
		const base64 = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		const payload = JSON.parse(atob(base64));
		if (!payload?.client_side_token || !payload?.success_url) return null;
		return payload as CheckoutTokenPayload;
	} catch {
		return null;
	}
}

/**
 * Returns true if the token has an exp claim and it is in the past.
 * Tokens without exp are treated as non-expiring.
 */
export function isTokenExpired(payload: CheckoutTokenPayload): boolean {
	if (!payload.exp) return false;
	return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Removes all Paddle-related params from the browser URL bar
 * without triggering a page reload.
 */
export function removePaddleParamsFromUrl(): void {
	if (typeof window === 'undefined') return;
	const params = new URLSearchParams(window.location.search);
	Object.values(PADDLE_URL_PARAMS).forEach((key) => params.delete(key));
	const newSearch = params.toString();
	const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
	window.history.replaceState({}, '', newUrl);
}
