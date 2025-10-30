import {Request, Response} from "express";
import {StatusCodes} from "http-status-codes";

/*
    This function serves as a health check endpoint for the Chat Service.
    It responds with a 200 OK status and a message indicating that the service is healthy.
 */
export function health(_req: Request, res: Response): void {
    res.status(StatusCodes.OK).send('Chats Service is healthy');
}
