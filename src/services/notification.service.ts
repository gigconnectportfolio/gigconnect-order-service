import {IOrderDocument, IOrderNotification} from "@kariru-k/gigconnect-shared";
import {OrderNotificationModel} from "../models/notification.schema";
import {socketIOOrderObject} from "../server";
import {getOrderByOrderId} from "./order.service";

export const createNotification = async (data: IOrderNotification): Promise<IOrderNotification> => {
    return await OrderNotificationModel.create(data);
}

export const getNotificationsById = async (userToId: string): Promise<IOrderNotification[]> => {
    return OrderNotificationModel.aggregate([
        {$match: {userTo: userToId}},
        {$sort: {createdAt: -1}}
    ]);
}

export const markNotificationAsRead = async (notificationId: string): Promise<IOrderNotification> => {
    const notification =  OrderNotificationModel.findOneAndUpdate(
        {_id: notificationId},
        {$set: {isRead: true}},
        {new: true}
    ) as unknown as IOrderNotification;

    const order: IOrderDocument = await getOrderByOrderId(notification.orderId);
    socketIOOrderObject.emit('order notification', order, notification);

    return notification;
}

export const sendNotification = async (data: IOrderDocument, userToId: string ,message: string): Promise<void> => {
    const notification: IOrderNotification = {
        userTo: userToId,
        senderUsername: data.sellerUsername,
        senderPicture: data.sellerImage,
        receiverUsername: data.buyerUsername,
        receiverPicture: data.buyerImage,
        message: message,
        orderId: data.orderId
    } as IOrderNotification;

    const orderNotification: IOrderNotification = await createNotification(notification);

    socketIOOrderObject.emit('order notification', data, orderNotification)
}
