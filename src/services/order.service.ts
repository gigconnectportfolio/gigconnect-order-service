import {
    BadRequestError, IDeliveredWork, IExtendedDelivery,
    IOrderDocument,
    IOrderMessage,
    IVerificationInput,
    lowerCase,
    NotFoundError, winstonLogger
} from "@kariru-k/gigconnect-shared";
import {OrderModel} from "../models/order.schema";
import {publishDirectMessage} from "../queues/order.producer";
import {orderChannel} from "../server";
import {config} from "../config";
import {sendNotification} from "./notification.service";
import axios from "axios";
import {Logger} from "winston";


const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Service', 'debug');
// GET METHODS

/**
 * This function retrieves an order document from the database based on the provided order ID.
 * @param orderId - The unique identifier of the order to be retrieved.
 */
export const getOrderByOrderId = async (orderId: string): Promise<IOrderDocument> => {
    const order: IOrderDocument[] = await OrderModel.aggregate([{$match: {orderId: orderId}}]);

    return order[0];
}

/**
 * This function retrieves all order documents associated with a specific seller ID.
 * @param sellerId - The unique identifier of the seller whose orders are to be retrieved.
 */
export const getOrdersBySellerId = async (sellerId: string): Promise<IOrderDocument[]> => {
    return OrderModel.aggregate([{$match: {sellerId: sellerId}}, {$sort: {createdAt: -1}}]);
}

/**
 * This function retrieves all order documents associated with a specific buyer ID.
 * @param buyerId - The unique identifier of the buyer whose orders are to be retrieved.
 */
export const getOrdersByBuyerId = async (buyerId: string): Promise<IOrderDocument[]> => {
    return OrderModel.aggregate([{$match: {buyerId: buyerId}}, {$sort: {createdAt: -1}}]);
}


/// CREATE METHODS

const generateTxRef = (prefix: string = 'ORD') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

export const createOrder = async (data: IOrderDocument): Promise<IOrderDocument & { txRef: string }> => {
    try {
        const txRef = generateTxRef(data.orderId);

        data.flutterwave = data.flutterwave || {};
        data.flutterwave.txRef = txRef;
        data.status = 'AWAITING_PAYMENT';
        data.paymentIntent = undefined;

        const order: IOrderDocument = await OrderModel.create(data);

        return { ...order, txRef };
    } catch (error) {
        log.log('error', '❌ Order Service createOrder() Method Error', error);
        throw new BadRequestError('Failed to create order.', 'OrderService:createOrder');
    }
}

export const verifyOrder = async (verificationData: IVerificationInput): Promise<IOrderDocument> => {
    const {transaction_id, tx_ref} = verificationData;

    // 1. Fetch Order for Data Access and Pre-Check
    // 'order' is fetched as an IOrderDocument (Mongoose Document instance)
    const order = await OrderModel.findOne({'flutterwave.txRef': tx_ref}).exec();

    if (!order) {
        throw new NotFoundError('Order not found for the provided transaction reference.', 'OrderService:verifyOrder');
    }

    // Integrity Check 1: Status must be AWAITING_PAYMENT
    if (order.status !== 'AWAITING_PAYMENT') {
        throw new BadRequestError(`Order status is not valid for verification. Current status: ${order.status}`, 'OrderService:verifyOrder');
    }

    // Calculate the secure expected total from the IOrderDocument properties
    const expectedServiceFee = order.serviceFee ?? 0;
    const expectedTotalAmount = order.price + expectedServiceFee;

    // 2. Secure Server-to-Server Verification with Flutterwave
    const flwVerificationUrl = `${config.FLUTTERWAVE_SECRET_KEY}/transactions/${transaction_id}/verify`;

    const flwResponse = await axios.get(flwVerificationUrl, {
        headers: {
            Authorization: `Bearer ${config.FLUTTERWAVE_SECRET_KEY}`,
        }
    });

    const flwData = flwResponse.data.data;

    // Integrity Check 2: Payment Status
    if (flwData.status !== 'successful') {
        throw new BadRequestError(`Payment not successful. Current status: ${flwData.status}`, 'OrderService:verifyOrder');
    }

    // Integrity Check 3: Amount Verification (using the expected total)
    if (flwData.amount !== expectedTotalAmount) {
        throw new BadRequestError(`Payment amount mismatch. Expected: ${expectedTotalAmount}, Received: ${flwData.amount}`, 'OrderService:verifyOrder');
    }

    // 4. Atomic Update and Final Status Change using OrderModel

    const update = {
        $set: {
            status: 'PROCESSING', // Order is now officially paid
            'flutterwave.txRef': flwData.tx_ref,
            'flutterwave.transactionId': flwData.id,
            'flutterwave.gatewayStatus': flwData.status,
            'flutterwave.paymentMethod': flwData.payment_type,
            'flutterwave.fee': flwData.app_fee,
        }
    };

    const updatedOrder = await OrderModel.findOneAndUpdate({
            'flutterwave.txRef': tx_ref, status: 'AWAITING_PAYMENT' // Crucial for preventing race conditions
        }, update, {new: true} // Returns the document AFTER update
    ).exec();

    // Final check on atomic update success
    if (!updatedOrder) {
        throw new BadRequestError('Order verification failed due to concurrent modification. Please retry.', 'OrderService:verifyOrder');
    }

    // 5. Execute Fulfillment Logic (using the atomically updated document)

    const fee = updatedOrder.serviceFee ?? 0;
    const totalAmount = fee + updatedOrder.price;

    const messageDetails: IOrderMessage = {
        sellerId: updatedOrder.sellerId, ongoingJobs: 1, type: 'create-order'
    }
    await publishDirectMessage(orderChannel, 'gigconnect-seller-updates', 'user-seller', JSON.stringify(messageDetails), 'Update seller data after payment confirmation');

    const emailMessageDetails: IOrderMessage = {
        orderId: updatedOrder.orderId,
        invoiceId: updatedOrder.invoiceId,
        orderDue: `${updatedOrder.offer.newDeliveryDate}`,
        amount: `${updatedOrder.price}`,
        buyerUsername: lowerCase(updatedOrder.buyerUsername),
        sellerUsername: lowerCase(updatedOrder.sellerUsername),
        title: updatedOrder.offer.gigTitle,
        description: updatedOrder.offer.description,
        requirements: updatedOrder.requirements,
        serviceFee: `${fee}`,
        total: `${totalAmount}`,
        orderUrl: `${config.CLIENT_URL}/orders/${updatedOrder.orderId}/activities`,
        template: 'orderPlaced'
    }
    await publishDirectMessage(orderChannel, 'gigconnect-order-exchange', 'order-email', JSON.stringify(emailMessageDetails), 'Send order placed email after payment confirmation');

    await sendNotification(updatedOrder, updatedOrder.sellerUsername, 'placed an order for your gig.');

    return updatedOrder;
}

/// UPDATE METHODS

/**
 * This function cancels an order by its ID, processes a refund if applicable,
 * and updates the order status in the database. It also publishes messages to update
 * seller and buyer data, and sends a notification about the cancellation.
 * @param orderId - The unique identifier of the order to be cancelled.
 * @param data - An object containing additional information for updating seller and buyer data.
 * @returns The updated order document after cancellation.
 * */
export const cancelOrder = async (orderId: string, data: IOrderMessage): Promise<IOrderDocument> => {

    const orderToRefund = await OrderModel.findOne({ orderId: orderId }).exec();

    if (!orderToRefund) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:cancelOrder');
    }

    if (orderToRefund.status === 'CANCELLED') {
        throw new Error('Order is already cancelled and cannot be processed.');
    }

    const transactionId = orderToRefund.flutterwave?.transactionId;
    const basePrice = orderToRefund.price;

    if (transactionId) {
        const refundAmount = basePrice * 0.95;

        try {
            const refundEndpoint = `${config.FLUTTERWAVE_API_URL}/transactions/${transactionId}/refund`;

            await axios.post(
                refundEndpoint,
                { amount: refundAmount },
                {
                    headers: {
                        Authorization: `Bearer ${config.FLUTTERWAVE_SECRET_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            log.info(`Refund request initiated for Order ID: ${orderId}, Amount: ${refundAmount}`);

        } catch (error) {
            log.log('error', `⚠️ Refund failed for Order ID: ${orderId}. Transaction ID: ${transactionId}`,error);
        }
    } else {
        log.info(`No transaction ID found for Order ID: ${orderId}. Assuming no refund was required.`);
    }


    try {
        const order: IOrderDocument = await OrderModel.findOneAndUpdate({orderId: orderId}, {
                $set: {
                    cancelled: true,
                    status: 'CANCELLED',
                    approvedAt: new Date()
                }},
            {new: true}
        ) as IOrderDocument;

        if (!order) {
            throw new Error('Failed to retrieve updated order document after cancellation.');
        }

        log.info(`Order status updated to CANCELLED for ID: ${orderId}`);

        // Update seller data
        await publishDirectMessage(orderChannel, 'gigconnect-seller-updates', 'user-seller', JSON.stringify({
            type: 'cancel-order', sellerId: data.sellerId
        }), 'Update seller data after order cancellation');

        // Update buyer data
        await publishDirectMessage(orderChannel, 'gigconnect-buyer-updates', 'user-buyer', JSON.stringify({
            type: 'cancel-order', buyerId: data.buyerId, purchasedGigs: data.purchasedGigs
        }), 'Update buyer data after order cancellation');

        await sendNotification(order, order.sellerUsername, "Your order has been cancelled.");

        log.info(`Cancellation messages published for Order ID: ${orderId}`);
        return order;

    } catch (error) {
        log.log('error', '❌ Order Service cancelOrder() Method Error', error);
        throw new Error('Failed to cancel order and finalize database update.');
    }
}

export const approveOrder = async (orderId: string, data: IOrderMessage): Promise<IOrderDocument> => {
    const order: IOrderDocument = await OrderModel.findOneAndUpdate({orderId: orderId}, {
            $set: {
                approved: true,
                status: 'Completed',
                approvedAt: new Date()
            }},
        {new: true}
    ) as IOrderDocument;

    if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:approveOrder');
    }

    const messageDetails: IOrderMessage = {
        sellerId: data.sellerId,
        buyerId: data.buyerId,
        ongoingJobs: data.ongoingJobs,
        completedJobs: data.completedJobs,
        totalEarnings: data.totalEarnings,
        recentDelivery: `${new Date()}`,
        type: 'approve-order'
    };

    await publishDirectMessage(orderChannel, 'gigconnect-seller-updates', 'user-seller', JSON.stringify(messageDetails), 'Update seller data after order approval');

    await publishDirectMessage(orderChannel, 'gigconnect-buyer-updates', 'user-buyer', JSON.stringify({
        type: 'purchased-gigs', buyerId: data.buyerId, purchasedGigs: data.purchasedGigs }), 'Update buyer data after order approval');

    await sendNotification(order, order.sellerUsername, "Your order has been approved.");


    return order;
}

export const deliverOrder = async(orderId: string, delivered: boolean, deliveredWork: IDeliveredWork): Promise<IOrderDocument> => {
    const order: IOrderDocument = await OrderModel.findOneAndUpdate({orderId: orderId}, {
        $set:
            {
                delivered: delivered,
                status: 'DELIVERED',
                ['events.orderDelivered']: new Date(),
            },
        $push:
            {
                deliveredWork: deliveredWork
            }
        },
        {new: true}
    ) as IOrderDocument;

    if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:deliverOrder');
    }

    const messageDetails: IOrderMessage = {
        orderId: orderId,
        buyerUsername: lowerCase(order.buyerUsername),
        sellerUsername: lowerCase(order.sellerUsername),
        title: order.offer.gigTitle,
        description: order.offer.description,
        orderUrl: `${config.CLIENT_URL}/orders/${order.orderId}/activities`,
        template: 'orderDelivered',
    }

    await publishDirectMessage(orderChannel, 'gigconnect-order-exchange', 'order-email', JSON.stringify(messageDetails), 'Order Delivery message sent to notification service');
    await sendNotification(order, order.buyerUsername, "Your order has been delivered.");

    return order;
}

export const requestDeliveryExtension = async (orderId: string, data: IExtendedDelivery): Promise<IOrderDocument> => {

    const {newDate, days, reason, originalDate} = data;

    const order: IOrderDocument = await OrderModel.findOneAndUpdate(
        {orderId: orderId},
        {
            $set: {
                ['requestExtension.originalDate']: originalDate,
                ['requestExtension.newDate']: newDate,
                ['requestExtension.days']: days,
                ['requestExtension.reason']: reason,
            }
        },
        {new: true}
    ).exec() as IOrderDocument;

    if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:requestDeliveryExtension');
    }

    const messageDetails: IOrderMessage = {
        buyerUsername: lowerCase(order.buyerUsername),
        sellerUsername: lowerCase(order.sellerUsername),
        originalDate: originalDate,
        newDate: newDate,
        reason: reason,
        orderUrl: `${config.CLIENT_URL}/orders/${order.orderId}/activities`,
        template: 'orderExtension',
    }

    await publishDirectMessage(orderChannel, 'gigconnect-order-exchange', 'order-email', JSON.stringify(messageDetails), 'Order Extension Request message sent to notification service');

    await sendNotification(order, order.buyerUsername, "There is a delivery extension request for your order.");
    await sendNotification(order, order.sellerUsername, "Your delivery extension request has been sent to the seller.");

    return order;
}

export const approveDeliveryDateExtension = async (orderId: string, data: IExtendedDelivery): Promise<IOrderDocument> => {
    const { newDate, days, reason, deliveryDateUpdate} = data;
    const order: IOrderDocument = await OrderModel.findOneAndUpdate(
        {orderId: orderId},
        {
            $set: {
                ['offer.newDeliveryDate']: newDate,
                ['offer.deliveryInDays']: days,
                ['offer.reason']: reason,
                ['events.deliveryDateUpdate']: new Date(`${deliveryDateUpdate}`),
                requestExtension: {
                    originalDate: '',
                    newDate: '',
                    days: 0,
                    reason: '',
                }
            }
        },
        {new: true}
    ).exec() as IOrderDocument;

    if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:approveDeliveryDateExtension');
    }

    const messageDetails: IOrderMessage = {
        subject: 'Delivery Date Extension Approved',
        buyerUsername: lowerCase(order.buyerUsername),
        sellerUsername: lowerCase(order.sellerUsername),
        header: 'Request Accepted',
        type: 'Accepted',
        message: 'You can continue working on the order.',
        orderUrl: `${config.CLIENT_URL}/orders/${order.orderId}/activities`,
        template: 'orderExtensionApproval',
    }

    await publishDirectMessage(orderChannel, 'gigconnect-order-exchange', 'order-email', JSON.stringify(messageDetails), 'Order Extension Approval message sent to notification service');

    await sendNotification(order, order.buyerUsername, "Your delivery date extension request has been approved.");
    await sendNotification(order, order.sellerUsername, "You have approved the delivery date extension request.");

    return order;
}

export const rejectDeliveryDateExtension = async (orderId: string): Promise<IOrderDocument> => {
    const order: IOrderDocument = await OrderModel.findOneAndUpdate(
        {orderId: orderId},
        {
            $set: {
                requestExtension: {
                    originalDate: '',
                    newDate: '',
                    days: 0,
                    reason: '',
                }
            }
        },
        {new: true}
    ).exec() as IOrderDocument;

    if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`, 'OrderService:rejectDeliveryDateExtension');
    }

    const messageDetails: IOrderMessage = {
        subject: 'Delivery Date Extension Rejected',
        buyerUsername: lowerCase(order.buyerUsername),
        sellerUsername: lowerCase(order.sellerUsername),
        header: 'Request Rejected',
        type: 'Rejected',
        message: 'Please adhere to the original delivery date. Contact the Buyer for more information',
        orderUrl: `${config.CLIENT_URL}/orders/${order.orderId}/activities`,
        template: 'orderExtensionApproval',
    }

    await publishDirectMessage(orderChannel, 'gigconnect-order-exchange', 'order-email', JSON.stringify(messageDetails), 'Order Extension Rejection message sent to notification service');

    await sendNotification(order, order.sellerUsername, "Your delivery date extension request has been rejected.");
    await sendNotification(order, order.buyerUsername, "You have rejected the delivery date extension request.");

    return order;
}
