import {IOrderDocument, IOrderNotifcation} from "@kariru-k/gigconnect-shared";
import {OrderNotificationModel} from "../models/notification.schema";
import {socketIOOrderObject} from "../server";

export const createNotification = async (data: IOrderNotifcation): Promise<IOrderNotifcation> => {
    return await OrderNotificationModel.create(data);
}

export const getNotificationsById = async (userToId: string): Promise<IOrderNotifcation[]> => {
    return OrderNotificationModel.aggregate([
        {$match: {userTo: userToId}},
        {$sort: {createdAt: -1}}
    ]);
}

export const markNotificationsAsRead = async (notificationId: string): Promise<IOrderNotifcation> => {
    const notification: IOrderNotifcation =  OrderNotificationModel.findOneAndUpdate(
        {_id: notificationId},
        {$set: {read: true}},
        {new: true}
    ) as IOrderNotifcation;
    return notification;
}

export const sendNotification = async (data: IOrderDocument, userToId: string ,message: string): Promise<void> => {
    const notification: IOrderNotifcation = {
        userTo: userToId,
        senderUsername: data.sellerUsername,
        senderPicture: data.sellerImage,
        receiverUsername: data.buyerUsername,
        receiverPicture: data.buyerImage,
        message: message,
        orderId: data.orderId
    } as IOrderNotifcation;

    const orderNotification: IOrderNotifcation = await createNotification(notification);

    socketIOOrderObject.emit('order notification', data, orderNotification)
}
