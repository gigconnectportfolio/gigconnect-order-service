import {NextFunction, Request, Response} from "express";
import {IOrderNotification} from "@kariru-k/gigconnect-shared";
import {getNotificationsById} from "../../services/notification.service";
import {StatusCodes} from "http-status-codes";

export const notifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try{
        const notifications: IOrderNotification[] = await getNotificationsById(req.params.userTo);

        res.status(StatusCodes.OK).json({
            message: 'Notifications fetched successfully',
            notifications,
        })
    } catch (error) {
        next(error);
    }
}
