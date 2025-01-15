import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/appError';
import { ICoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { calculateDiscount } from './coupon.utils';

const createCoupon = async (couponData: Partial<ICoupon>) => {
   const coupon = new Coupon(couponData);
   return await coupon.save();
};

const getAllCoupon = async (query: Record<string, unknown>) => {
   const brandQuery = new QueryBuilder(Coupon.find(), query)
      .search(['code'])
      .filter()
      .sort()
      .paginate()
      .fields();

   const result = await brandQuery.modelQuery;
   const meta = await brandQuery.countTotal();

   return {
      meta,
      result,
   };
};

const updateCoupon = async (payload: Partial<ICoupon>, couponCode: string) => {
   console.log({ payload, couponCode });

   const currentDate = new Date();

   const coupon = await Coupon.findOne({ code: couponCode });

   if (!coupon) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
   }

   if (coupon.endDate < currentDate) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has expired.');
   }

   const updatedCoupon = await Coupon.findByIdAndUpdate(
      coupon._id,
      { $set: payload },
      { new: true, runValidators: true }
   );

   return updatedCoupon;
};

const getCouponByCode = async (orderAmount: number, couponCode: string) => {
   const currentDate = new Date();

   const coupon = await Coupon.findOne({ code: couponCode });

   if (!coupon) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
   }

   if (!coupon.isActive) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon is inactive.');
   }

   if (coupon.endDate < currentDate) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has expired.');
   }

   if (coupon.startDate > currentDate) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has not started.');
   }

   if (orderAmount < coupon.minOrderAmount) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Below Minimum order amount');
   }

   const discountAmount = calculateDiscount(coupon, orderAmount);

   const discountedPrice = orderAmount - discountAmount;

   return { coupon, discountedPrice };
};

const deleteCoupon = async (couponId: string) => {
   const coupon = await Coupon.findById(couponId);

   if (!coupon) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
   }

   await Coupon.updateOne({ _id: coupon._id }, { isDeleted: true });

   return { message: 'Coupon deleted successfully.' };
};

export const CouponService = {
   createCoupon,
   getAllCoupon,
   updateCoupon,
   getCouponByCode,
   deleteCoupon,
};
