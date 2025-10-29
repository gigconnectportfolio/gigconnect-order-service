import {model, Schema} from "mongoose";
import {IOrderNotifcation} from "@kariru-k/gigconnect-shared";

const notificationSchema: Schema = new Schema(
    {
        userTo: { type: String, default: '', index: true },
        senderUsername: { type: String, default: ''},
        senderPicture: { type: String, default: '',},
        receiverUsername: { type: String, default: ''},
        receiverPicture: { type: String, default: '',},
        isRead: { type: Boolean, default: false },
        message: { type: String, default: '' },
        orderId: { type: String, default: ''},
        createdAt: { type: Date, default: Date.now },
    }
);

export const OrderNotificationModel =  Model<IOrderNotifcation> = model<IOrderNotifcation>('OrderNotification', notificationSchema, 'OrderNotification');
