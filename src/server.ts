import {Logger} from "winston";
import {CustomError, IAuthPayload, IErrorResponse, winstonLogger} from "@kariru-k/gigconnect-shared";
import {config} from "./config";
import {Application, json, NextFunction, Request, Response, urlencoded} from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import {checkConnection} from "./elasticsearch";
import compression from "compression";
import hpp from "hpp";
import helmet from "helmet";
import * as http from "node:http";
import {appRoutes} from "./routes";
import {Channel} from "amqplib";
import {createConnection} from "./queues/connection";
import {Server} from "socket.io";
import {consumerReviewFanoutMessages} from "./queues/order.consumer";

const SERVER_PORT = 4006;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Server', 'debug');
export let orderChannel: Channel;
export let socketIOOrderObject: Server;


export const start = (app: Application): void => {
    securityMiddleware(app);
    standardMiddleware(app);
    startElasticSearch();
    routesMiddleware(app);
    startQueues();
    startServer(app);
    OrderErrorHandler(app);
    log.info("Worker with process id of " + process.pid + " on Order server has started");
};

async function startServer(app: Application): Promise<void> {
    try {
        const httpServer: http.Server = new http.Server(app);
        const socketIO: Server = await createSocketIO(httpServer);
        startHttpServer(httpServer);
        socketIOOrderObject = socketIO;
    } catch (error) {
        log.log('error', 'Order service startserver() error method:', error);
    }
}

async function createSocketIO(httpServer: http.Server): Promise<Server> {
    return new Server(httpServer, {
        cors: {
            origin: config.API_GATEWAY_URL,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        }
    });
}

function startHttpServer(httpServer: http.Server): void {
    try {
        log.info(`Order server has started with process id ${process.pid}`);
        httpServer.listen(SERVER_PORT, () => {
            log.info(`Order Service is running on port ${SERVER_PORT}`);
        });
    } catch (error) {
        log.log('error', 'Order service starthttpserver() error method:', error);
    }
}

function securityMiddleware(app: Application): void {
    app.set("trust proxy", 1);
    app.use(hpp());
    app.use(helmet());

    app.use(
        cors({
            origin: config.API_GATEWAY_URL,
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        })
    );

    app.use((req: Request, _res: Response, next: NextFunction): void => {
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(" ")[1];
            req.currentUser = jwt.verify(token, config.JWT_TOKEN!) as IAuthPayload;
        }
        next()
    })
}

function standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(json({limit: '200mb'}));
    app.use(urlencoded({ extended: true, limit: '200mb' }));
}

function routesMiddleware(app: Application): void {
    appRoutes(app);
}

async function startQueues(): Promise<void> {
    orderChannel = await createConnection() as Channel;
    await consumerReviewFanoutMessages(orderChannel);
}

function startElasticSearch(): void {
    checkConnection();
}



function OrderErrorHandler(app: Application): void {
    app.use((err: IErrorResponse, _req: Request, res: Response, _next: NextFunction) => {
        log.log('error', `Order Service: Unhandled error: ${err.message}`, err);
        if (err instanceof CustomError){
            res.status(err.statusCode).json(err.serializeError());
        }
    });
}
