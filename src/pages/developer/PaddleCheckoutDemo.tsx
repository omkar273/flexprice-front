import { PaddleCheckoutButton } from '@/components/molecules/PaddleCheckout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';

/** Sample price IDs from Paddle docs — replace with your own from Paddle dashboard */
const SAMPLE_PRICE_IDS = {
	proPlan: 'pri_01gsz8ntc6z7npqqp6j4ys0w1w',
	enterprisePlan: 'pri_01h1vjfevh5etwq3rb416a23h2',
} as const;

/** Sandbox test card: 4242 4242 4242 4242 | Expiry: any future | CVC: 100 */
const DEMO_ITEMS = [
	{ priceId: SAMPLE_PRICE_IDS.proPlan, quantity: 5 },
	{ priceId: SAMPLE_PRICE_IDS.enterprisePlan, quantity: 1 },
];

const PREFILLED_CUSTOMER = {
	email: 'customer@example.com',
	address: {
		countryCode: 'US',
		postalCode: '10021',
		region: 'New York',
		city: 'New York',
		line1: '123 Example St',
	},
};

const PaddleCheckoutDemo = () => {
	const { openCheckout } = usePaddleCheckout();

	return (
		<div className='container max-w-2xl py-12'>
			<div className='space-y-8'>
				<div>
					<h1 className='text-2xl font-semibold text-zinc-900'>Paddle Overlay Checkout</h1>
					<p className='mt-2 text-sm text-zinc-500'>
						Test the Paddle overlay checkout. Uses sandbox mode with test price IDs. Replace with your Paddle price IDs from Catalog →
						Products.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Multi-page checkout</CardTitle>
						<CardDescription>Opens overlay with contact info → payment screens</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<PaddleCheckoutButton items={DEMO_ITEMS} className='w-full'>
							Sign up now
						</PaddleCheckoutButton>
						<p className='text-xs text-zinc-500'>
							Uses sample price IDs from Paddle docs. Create products in your Paddle sandbox to use your own.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>With prefilled customer</CardTitle>
						<CardDescription>Skips contact screen; lands directly on payment</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className='w-full'
							onClick={() =>
								openCheckout({
									items: DEMO_ITEMS,
									customer: PREFILLED_CUSTOMER,
								})
							}>
							Checkout with prefilled email
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>One-page checkout</CardTitle>
						<CardDescription>Single-page checkout experience</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							className='w-full'
							onClick={() =>
								openCheckout({
									items: DEMO_ITEMS,
									settings: { variant: 'one-page' },
								})
							}>
							One-page overlay
						</Button>
					</CardContent>
				</Card>

				<div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'>
					<strong>Sandbox test card:</strong> 4242 4242 4242 4242 | Expiry: any future date | CVC: 100
				</div>
			</div>
		</div>
	);
};

export default PaddleCheckoutDemo;
