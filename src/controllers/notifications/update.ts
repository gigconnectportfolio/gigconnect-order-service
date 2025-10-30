import {NextFunction, Request, Response} from "express";
import {IOrderNotification} from "@kariru-k/gigconnect-shared";
import {markNotificationAsRead} from "../../services/notification.service";
import {StatusCodes} from "http-status-codes";

export const markSingleNotificationAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const { notificationId } = req.body;

        const notification: IOrderNotification = await markNotificationAsRead(notificationId);
        res.status(StatusCodes.OK).json({
            message: 'Notification marked as read successfully',
            notification,
        });
    } catch (error) {
        next(error);
    }
}
