import {Client, estypes} from "@elastic/elasticsearch";
import {config} from "./config";
import {Logger} from "winston";
import {winstonLogger} from "@kariru-k/gigconnect-shared";

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'Order ElasticSearch Server', 'debug');

export const elasticSearchClient = new Client({
    node: `${config.ELASTIC_SEARCH_URL}`,
});


/**
    This function checks the connection to the Elasticsearch cluster by querying its health status.
    It continuously attempts to connect until a successful connection is established.
    If the connection fails, it logs the error and retries.
    @returns {Promise<void>} A promise that resolves when a successful connection is made.
 **/
export async function checkConnection(): Promise<void> {
    let isConnected = false;
    while (!isConnected) {
        try {
            const response: estypes.ClusterHealthResponse = await elasticSearchClient.cluster.health({});
            log.info(`Order ElasticSearch Server ElasticSearch health status: ${response.status}`);
            isConnected = true;
        } catch (error) {
            log.error("Failed to connect to ElasticSearch", error);
            log.log('error', 'Order ElasticSearch Server checkConnection() Method', error);
        }
    }
}
