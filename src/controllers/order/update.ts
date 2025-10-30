import {NextFunction, Request, Response} from "express";
import {StatusCodes} from "http-status-codes";
import {orderUpdateSchema} from "../../schemes/order";
import {
    BadRequestError,
    IDeliveredWork,
    IOrderDocument,
    IVerificationInput,
    uploads
} from "@kariru-k/gigconnect-shared";
import {
    approveDeliveryDateExtension, approveOrder, cancelOrder,
    rejectDeliveryDateExtension,
    requestDeliveryExtension, sellerDeliverOrder, verifyOrder
} from "../../services/order.service";
import {UploadApiResponse} from "cloudinary";
import crypto from "crypto";


export const verifyOrderController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const transaction_id = req.params.transaction_id;
        const tx_ref = req.params.tx_ref;

        if (!transaction_id || !tx_ref) {
            throw new BadRequestError('Transaction ID and Reference are required in the query string for verification.', 'VerifyOrderController:verifyOrder');
        }

        const verificationData: IVerificationInput = {
            transaction_id,
            tx_ref,
        };


        const verifiedOrder = await verifyOrder(verificationData);


        // 4. Send Response
        res.status(StatusCodes.OK).json({
            message: 'Payment verification successful. Order status updated to PROCESSING.',
            order: verifiedOrder,
        });

    } catch (error) {
        next(error);
    }
};


export const cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        await cancelOrder(orderId, req.body.orderData);

        res.status(StatusCodes.OK).json({
            message: 'Order cancelled successfully',
        })
    } catch (error) {
        next(error);
    }
}

export const requestExtension = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { error } = orderUpdateSchema.validate(req.body);

        if (error?.details) {
            throw new BadRequestError(error.details[0].message, 'Order Update Validation Error');
        }

        const { orderId } = req.params;
        const order: IOrderDocument = await requestDeliveryExtension(orderId, req.body);
        res.status(StatusCodes.OK).json({
            message: 'Delivery extension requested successfully',
            order,
        })
    } catch (error) {
        next(error);
    }
}

export const deliveryDate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { error } = orderUpdateSchema.validate(req.body);

        if (error?.details) {
            throw new BadRequestError(error.details[0].message, 'Order Update Validation Error');
        }

        const { orderId, type } = req.params;

        const order: IOrderDocument = type === 'approve' ? await approveDeliveryDateExtension(orderId, req.body) : await rejectDeliveryDateExtension(orderId);

        res.status(StatusCodes.OK).json({
            message: `Delivery date extension ${type}d successfully`,
            order,
        })
    } catch (error) {
        next(error);
    }
}

export const buyerApproveOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const order = await approveOrder(orderId, req.body);

        res.status(StatusCodes.OK).json({
            message: 'Order approved successfully',
            order,
        })
    } catch (error) {
        next(error);
    }
}

export const deliverOrder = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { orderId } = req.params;
        let file: string = req.body.file;
        const randomBytes: Buffer = crypto.randomBytes(20);
        const randomCharacters: string = randomBytes.toString('hex');

        let result: UploadApiResponse;
        if (file){
            result = (req.body.fileType === 'zip' ? await uploads(file, `${randomCharacters}.zip`) : await uploads(file)) as UploadApiResponse;
            if (!result.public_id){
                throw new BadRequestError('File upload failed. Try again', 'Create deliverOrder() Method File Upload Error');
            }
            file = result?.secure_url;
        }

        const deliveredWork: IDeliveredWork = {
            message: req.body.message,
            file: file,
            fileType: req.body.fileType,
            fileSize: req.body.fileSize,
            fileName: req.body.fileName
        }

        const order: IOrderDocument = await sellerDeliverOrder(orderId, true, deliveredWork);

        res.status(StatusCodes.OK).json({
            message: 'Order delivered successfully',
            order,
        })
    } catch (error) {
        next(error);
    }
}

