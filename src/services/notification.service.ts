import {IOrderDocument, IOrderNotification} from "@kariru-k/gigconnect-shared";
import {OrderNotificationModel} from "../models/notification.schema";
import {socketIOOrderObject} from "../server";

export const createNotification = async (data: IOrderNotification): Promise<IOrderNotification> => {
    return await OrderNotificationModel.create(data);
}

export const getNotificationsById = async (userToId: string): Promise<IOrderNotification[]> => {
    return OrderNotificationModel.aggregate([
        {$match: {userTo: userToId}},
        {$sort: {createdAt: -1}}
    ]);
}

export const markNotificationsAsRead = async (notificationId: string): Promise<IOrderNotification> => {
    return OrderNotificationModel.findOneAndUpdate(
        {_id: notificationId},
        {$set: {read: true}},
        {new: true}
    ) as unknown as IOrderNotification;
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
