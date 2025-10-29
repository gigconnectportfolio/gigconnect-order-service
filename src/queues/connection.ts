import client, {Channel, Connection} from "amqplib";
import {config} from "../config";
import {Logger} from "winston";
import {winstonLogger} from "@kariru-k/gigconnect-shared";

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Service RabbitMQ Connection', 'debug');

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function createConnection(): Promise<Channel | undefined> {
    try {
        if (connection && channel) {
            return channel;
        }

        connection = await client.connect(`${config.RABBITMQ_ENDPOINT}`);
        channel = await connection.createChannel();

        log.info("✅ Order Server Connected To Queue Successfully");

        // Handle graceful shutdown once
        setupGracefulShutdown(connection, channel);

        return channel;
    } catch (error) {
        log.log('error', `❌ Order Service createConnection() Method`, error);
        return undefined;
    }
}

function setupGracefulShutdown(connection: Connection, channel: Channel): void {
    process.once('SIGINT', async () => {
        log.info('🛑 Closing RabbitMQ channel and connection');
        await channel.close();
        await connection.close();
    });
}
