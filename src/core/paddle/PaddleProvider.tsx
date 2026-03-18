import { useEffect, useRef } from 'react';

const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

const PADDLE_TXN_PARAM = '_ptxn';
const PADDLE_CUSTOMER_AUTH_PARAM = '_pca';

/**
 * Extracts Paddle transaction ID and optional customer auth token from URL.
 * Removes both params from the URL. Returns { txnId, customerAuthToken } or null.
 *
 * The save-card option only appears with one-page checkout and requires customerAuthToken
 * when the backend includes it (generated via POST /customers/{id}/auth-token).
 */
function consumePaddleCheckoutParams(): { txnId: string; customerAuthToken?: string } | null {
	if (typeof window === 'undefined') return null;

	const params = new URLSearchParams(window.location.search);
	const txnId = params.get(PADDLE_TXN_PARAM);
	const customerAuthToken = params.get(PADDLE_CUSTOMER_AUTH_PARAM) || undefined;

	if (!txnId || !txnId.startsWith('txn_')) return null;

	// Remove Paddle params from URL without full page reload
	params.delete(PADDLE_TXN_PARAM);
	params.delete(PADDLE_CUSTOMER_AUTH_PARAM);
	const newSearch = params.toString();
	const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
	window.history.replaceState({}, '', newUrl);

	return { txnId, customerAuthToken };
}

export const PaddleProvider = ({ children }: { children: React.ReactNode }) => {
	const initialized = useRef(false);

	useEffect(() => {
		if (!PADDLE_TOKEN || initialized.current || typeof window === 'undefined') {
			return;
		}

		initialized.current = true;

		const Paddle = window.Paddle;
		if (!Paddle) {
			console.warn('Paddle.js not loaded. Ensure the script is included in index.html');
			return;
		}

		// Set sandbox for test token (test_ prefix), production for live token
		const isSandbox = PADDLE_TOKEN.startsWith('test_');
		Paddle.Environment.set(isSandbox ? 'sandbox' : 'production');

		Paddle.Initialize({
			token: PADDLE_TOKEN,
			checkout: {
				settings: {
					displayMode: 'overlay',
					theme: 'light',
					locale: 'en',
				},
			},
			eventCallback: (data: unknown) => {
				const event = data as { name?: string };
				switch (event?.name) {
					case 'checkout.loaded':
						console.log('[Paddle] Checkout opened');
						break;
					case 'checkout.completed':
						console.log('[Paddle] Checkout completed');
						break;
					case 'checkout.closed':
						console.log('[Paddle] Checkout closed');
						break;
				}
			},
		});

		// Open checkout when URL contains ?_ptxn=txn_xxx (from Paddle transaction checkout URL)
		// e.g. https://localhost:3000?_ptxn=txn_01kknjycbjnf801kn7tgda9rdj
		// For save-card option to appear: use one-page variant + pass _pca (customer auth token) if backend provides it
		const params = consumePaddleCheckoutParams();
		if (params) {
			setTimeout(() => {
				Paddle.Checkout.open({
					transactionId: params.txnId,
					...(params.customerAuthToken && { customerAuthToken: params.customerAuthToken }),
					settings: {
						displayMode: 'overlay',
						variant: 'one-page', // Required for save-card option to appear
					},
				});
			}, 100);
		}
	}, []);

	return <>{children}</>;
};
