import {Application} from "express";
import {healthRoutes} from "./routes/health";
import {verifyGatewayRequest} from "@kariru-k/gigconnect-shared";
import {orderRoutes} from "./routes/order";


const BASE_PATH = '/api/v1/order';

export const appRoutes = (app: Application): void => {
    app.use('', healthRoutes());
    app.use(BASE_PATH, verifyGatewayRequest, orderRoutes());
}


