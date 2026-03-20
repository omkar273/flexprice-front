import { useEffect, useRef } from 'react';
import { CHECKOUT_PATH, PADDLE_URL_PARAMS } from './constants';

const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

/**
 * PaddleProvider — routing guard + demo init only.
 *
 * Responsibilities:
 * 1. Redirect: if _ptxn or token params are present on any page other than
 *    /checkout, redirect there preserving the full query string.
 * 2. Demo init: for non-checkout pages, initialize Paddle.js with the
 *    VITE_PADDLE_CLIENT_TOKEN so the developer demo page works.
 *
 * The /checkout page (CheckoutPage) owns its own Paddle initialization
 * using the per-tenant client_side_token decoded from the JWT.
 */
export const PaddleProvider = ({ children }: { children: React.ReactNode }) => {
	const initialized = useRef(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		const hasPaddleParams = params.has(PADDLE_URL_PARAMS.TXN) || params.has(PADDLE_URL_PARAMS.TOKEN);

		// Redirect to /checkout if Paddle params land on the wrong page
		if (hasPaddleParams && window.location.pathname !== CHECKOUT_PATH) {
			window.location.replace(`${CHECKOUT_PATH}${window.location.search}`);
			return;
		}

		// Skip init on /checkout — CheckoutPage handles per-tenant initialization
		if (window.location.pathname === CHECKOUT_PATH) return;

		// Initialize Paddle for demo/internal pages using the shared env token
		if (!PADDLE_TOKEN || initialized.current) return;

		const Paddle = window.Paddle;
		if (!Paddle) {
			console.warn('[Paddle] Script not loaded. Add paddle.js script to index.html.');
			return;
		}

		initialized.current = true;
		Paddle.Environment.set(PADDLE_TOKEN.startsWith('test_') ? 'sandbox' : 'production');
		Paddle.Initialize({
			token: PADDLE_TOKEN,
			checkout: {
				settings: {
					displayMode: 'overlay',
					theme: 'light',
					locale: 'en',
				},
			},
		});
	}, []);

	return <>{children}</>;
};
