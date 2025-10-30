import {Logger} from "winston";
import {winstonLogger} from "@kariru-k/gigconnect-shared";
import {config} from "../config";
import {Channel} from "amqplib";
import {createConnection} from "./connection";

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Service Queue Producer', 'debug');

export async function publishDirectMessage(
    channel: Channel,
    exchangeName: string,
    routingKey: string,
    message: string,
    logMessage: string
): Promise<void> {
    try {
        if (!channel){
            channel = await createConnection() as Channel;
        }

        await channel.assertExchange(exchangeName, 'direct', { durable: true });
        const published = channel.publish(
            exchangeName,
            routingKey,
            Buffer.from(message)
        );

        if (published) {
            log.info(`✅ ${logMessage} published successfully to exchange ${exchangeName} with routing key ${routingKey}`);
        } else {
            log.warn(`❗️ Failed to publish ${logMessage} to exchange ${exchangeName} with routing key ${routingKey}`);
        }

    } catch (error) {
        log.log('error', `❌ Order Service publishDirectMessage() Method`, error);
    }
}
