import {NextFunction, Request, Response} from "express";
import {IOrderDocument} from "@kariru-k/gigconnect-shared";
import {getOrderByOrderId, getOrdersByBuyerId, getOrdersBySellerId} from "../services/order.service";
import {StatusCodes} from "http-status-codes";


export const orderId = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const order: IOrderDocument = await getOrderByOrderId(req.params.orderId);
        res.status(StatusCodes.OK).json({
            message: 'Order fetched successfully',
            order,
        });
    } catch (error) {
        next(error)
    }
}

export const sellerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders: IOrderDocument[] = await getOrdersBySellerId(req.params.sellerId);
        res.status(StatusCodes.OK).json({
            message: 'Orders fetched successfully',
            orders,
        });
    } catch (error) {
        next(error);
    }
}

export const buyerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const orders: IOrderDocument[] = await getOrdersByBuyerId(req.params.buyerId);
        res.status(StatusCodes.OK).json({
            message: 'Orders fetched successfully',
            orders,
        });
    } catch (error) {
        next(error);
    }
}


