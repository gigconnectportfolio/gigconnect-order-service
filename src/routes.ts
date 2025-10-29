import {Application} from "express";


const BASE_PATH = '/api/v1/order';

export const appRoutes = (app: Application): void => {
    app.use('', () => 'Order Service is healthy');
    app.use(BASE_PATH, () => 'Order Service is healthy');
}


