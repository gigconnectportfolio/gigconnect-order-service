import {winstonLogger} from "@kariru-k/gigconnect-shared";
import {Logger} from "winston";
import {config} from "../config";
import {createConnection} from "./connection";
import {Channel, ConsumeMessage, Replies} from "amqplib";
import {updateOrderReview} from "../services/order.service";

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order Service Consumer', 'debug');

export const consumerReviewFanoutMessages = async (channel: Channel): Promise<void> => {
    try {
        if (!channel) {
            channel = (await createConnection()) as Channel;
        }

        const exchangeName = 'gigconnect-review';
        const queueName = 'order-review-queue';

        await channel.assertExchange(exchangeName, 'fanout', {durable: true});

        const gigConnectQueue: Replies.AssertQueue = await channel.assertQueue(queueName, {
            durable: true,
            autoDelete: false
        });
        await channel.bindQueue(gigConnectQueue.queue, exchangeName, '');

        channel.consume(gigConnectQueue.queue, async (msg: ConsumeMessage | null) => {
            if (msg) {
                await updateOrderReview(JSON.parse(msg.content.toString()));
                channel.ack(msg);
            } else {
                log.error('Received null message');
            }
        });
    } catch (error) {
        log.error(`Error in consumerReviewFanoutMessages: ${error}`);
    }
}
