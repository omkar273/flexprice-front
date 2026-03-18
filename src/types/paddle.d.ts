/**
 * Paddle.js global type declarations
 * @see https://developer.paddle.com/paddlejs/overview
 */
declare global {
	interface Window {
		Paddle?: {
			Environment: { set: (env: 'sandbox' | 'production') => void };
			Initialize: (config: {
				token: string;
				pwCustomer?: { id: string };
				checkout?: { settings: Record<string, unknown> };
				eventCallback?: (data: unknown) => void;
			}) => void;
			Checkout: {
				open: (options: {
					items?: Array<{ priceId: string; quantity?: number }>;
					transactionId?: string;
					customer?: {
						email?: string;
						id?: string;
						address?: {
							countryCode?: string;
							postalCode?: string;
							region?: string;
							city?: string;
							line1?: string;
						};
					};
					settings?: {
						displayMode?: 'overlay' | 'inline';
						theme?: 'light' | 'dark' | 'system';
						locale?: string;
						variant?: 'multi-page' | 'one-page';
						successUrl?: string;
					};
					discountCode?: string;
					discountId?: string;
					customerAuthToken?: string;
				}) => void;
			};
		};
	}
}

export {};
