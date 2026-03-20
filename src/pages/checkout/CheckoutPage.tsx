import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, CreditCard, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/atoms/Button';
import { PADDLE_URL_PARAMS, decodeCheckoutToken, isTokenExpired, removePaddleParamsFromUrl } from '@/core/paddle';

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckoutState = 'loading' | 'open' | 'expired' | 'invalid';

// ─── Error / state UI ─────────────────────────────────────────────────────────

interface StateCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
}

const StateCard = ({ icon, title, description, actionLabel, onAction }: StateCardProps) => (
	<div className='min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6'>
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: 'easeOut' }}
			className='w-full max-w-lg'>
			<Card className='bg-white border border-zinc-200 rounded-xl shadow-sm'>
				<CardHeader className='text-center pb-6 pt-10 px-8'>
					<div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100'>
						<div className='text-zinc-600'>{icon}</div>
					</div>
					<CardTitle className='text-[20px] font-medium text-zinc-950 mb-4 leading-normal'>{title}</CardTitle>
				</CardHeader>
				<CardContent className='text-center px-8 pb-10'>
					<p className='text-base text-zinc-500 mb-8 leading-normal max-w-md mx-auto'>{description}</p>
					{actionLabel && onAction && (
						<Button
							onClick={onAction}
							className='w-full sm:w-auto min-w-[140px] transition-all duration-200 hover:opacity-90'
							variant='outline'>
							<RefreshCw className='w-4 h-4 mr-2' />
							{actionLabel}
						</Button>
					)}
				</CardContent>
			</Card>
		</motion.div>
	</div>
);

// ─── Loading backdrop ─────────────────────────────────────────────────────────

const LoadingState = () => (
	<div className='min-h-screen flex items-center justify-center bg-zinc-50'>
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className='flex flex-col items-center gap-4'>
			<div className='h-10 w-10 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin' />
			<p className='text-sm text-zinc-500'>Loading payment form…</p>
		</motion.div>
	</div>
);

// ─── Ready backdrop (shown while Paddle overlay is open) ──────────────────────

const ReadyState = () => (
	<div className='min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6'>
		<div className='max-w-md w-full text-center space-y-6'>
			<div className='flex justify-center'>
				<div className='rounded-full bg-zinc-100 p-4'>
					<CreditCard className='h-12 w-12 text-zinc-600' />
				</div>
			</div>
			<div>
				<h1 className='text-xl font-medium text-zinc-900'>Complete your payment</h1>
				<p className='mt-2 text-sm text-zinc-500'>
					Complete your payment in the form above. If it doesn&apos;t appear, your link may have expired.
				</p>
			</div>
		</div>
	</div>
);

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Public checkout page. Owns the entire Paddle checkout lifecycle.
 *
 * URL format (built by backend):
 *   /checkout?_ptxn=txn_xxx&token=eyJ...
 *
 * - _ptxn  : Paddle transaction ID → passed to Paddle.Checkout.open()
 * - token  : Backend-signed JWT → decoded to get client_side_token + success_url
 */
const CheckoutPage = () => {
	const [searchParams] = useSearchParams();
	const [state, setState] = useState<CheckoutState>('loading');
	const paddleInitialized = useRef(false);

	useEffect(() => {
		const txnId = searchParams.get(PADDLE_URL_PARAMS.TXN);
		const rawToken = searchParams.get(PADDLE_URL_PARAMS.TOKEN);

		// Both params are required
		if (!txnId || !rawToken) {
			setState('invalid');
			return;
		}

		const payload = decodeCheckoutToken(rawToken);
		if (!payload) {
			setState('invalid');
			return;
		}

		if (isTokenExpired(payload)) {
			setState('expired');
			return;
		}

		const Paddle = window.Paddle;
		if (!Paddle) {
			console.error('[Paddle] window.Paddle is not defined. Ensure paddle.js is loaded in index.html.');
			setState('invalid');
			return;
		}

		// Clean params from URL bar before opening overlay
		removePaddleParamsFromUrl();

		if (paddleInitialized.current) return;
		paddleInitialized.current = true;

		const environment = payload.client_side_token.startsWith('test_') ? 'sandbox' : 'production';
		Paddle.Environment.set(environment);
		Paddle.Initialize({
			token: payload.client_side_token,
			checkout: {
				settings: {
					displayMode: 'overlay',
					theme: 'light',
					locale: 'en',
					successUrl: payload.success_url,
				},
			},
		});

		// Small delay to ensure Paddle is fully ready before opening
		setTimeout(() => {
			Paddle.Checkout.open({
				transactionId: txnId,
				settings: {
					displayMode: 'overlay',
					variant: 'one-page',
					successUrl: payload.success_url,
				},
			});
			setState('open');
		}, 100);
	}, [searchParams]);

	if (state === 'loading') return <LoadingState />;

	if (state === 'expired') {
		return (
			<StateCard
				icon={<Clock className='h-9 w-9' />}
				title='Payment Link Expired'
				description='This payment link has expired. Please request a new payment link from your provider.'
			/>
		);
	}

	if (state === 'invalid') {
		return (
			<StateCard
				icon={<AlertCircle className='h-9 w-9' />}
				title='Invalid Payment Link'
				description='This payment link is invalid or missing required information. Please check your link or request a new one.'
				actionLabel='Refresh Page'
				onAction={() => window.location.reload()}
			/>
		);
	}

	return <ReadyState />;
};

export default CheckoutPage;
