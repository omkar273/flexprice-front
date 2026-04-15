import { Coupon } from '@/models/Coupon';
import { COUPON_TYPE } from '@/types';

const filterValidCoupons = (coupons: Coupon[], currency?: string) => {
	const validCoupons = coupons.filter((coupon) => {
		if (coupon.redeem_after && coupon.redeem_before) {
			return new Date(coupon.redeem_after) <= new Date() && new Date(coupon.redeem_before) >= new Date();
		}
		return true;
	});

	const validCouponsWithRedemptions = validCoupons.filter((coupon) => {
		if (coupon.max_redemptions && coupon.max_redemptions > 0) {
			return coupon.total_redemptions < coupon.max_redemptions;
		}
		return true; // No redemption limit, so it's valid
	});

	// Filter by currency if provided
	const validCouponsWithCurrency = currency
		? validCouponsWithRedemptions.filter((coupon) =>
				coupon.type === COUPON_TYPE.PERCENTAGE ? true : coupon.currency.toLowerCase() === currency.toLowerCase(),
			)
		: validCouponsWithRedemptions;

	return validCouponsWithCurrency;
};

export default filterValidCoupons;
