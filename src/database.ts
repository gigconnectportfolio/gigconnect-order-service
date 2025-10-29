import {Logger} from "winston";
import {winstonLogger} from "@kariru-k/gigconnect-shared";
import {config} from "./config";
import mongoose from "mongoose";

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Database Server', 'debug');

export const databaseConnection = async (): Promise<void> => {
    try {
        await mongoose.connect(`${config.DATABASE_URL}`);
        log.info('Order Service databaseConnection() method: MongoDB connected successfully');
    } catch (error) {
        log.log('error', `Order Service databaseConnection() method error:`, error);
    }
}
