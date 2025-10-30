import {NextFunction, Request, Response} from "express";
import {orderSchema} from "../schemes/order";
import {BadRequestError, IOrderDocument} from "@kariru-k/gigconnect-shared";
import {createOrder} from "../services/order.service";
import {StatusCodes} from "http-status-codes";

export const order = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
        const { error } = orderSchema.validate(req.body);

        if(error?.details){
            throw new BadRequestError(error.details[0].message, 'Create Order Validation Error');
        }

        const serviceFee: number = req.body.price < 1000 ? 100 : Math.round(req.body.price * 0.1);

        let orderData: IOrderDocument = req.body;
        orderData = {
            ...orderData,
            serviceFee,
        }

        const order = await createOrder(orderData);

        res.status(StatusCodes.CREATED).json({
            message: 'Order created successfully',
            order,
        })

    } catch (error) {
        next(error);
    }
}
