# Order Service (7-order-service)

The Order Service manages orders, payments, and order lifecycle events in GigConnect. It exposes REST APIs via the API Gateway, stores order data in MongoDB, integrates with Flutterwave for payments, emits/consumes events via RabbitMQ, and can deliver real-time updates over Socket.IO. Logs are shipped to Elasticsearch; Elastic APM is optional.

---

## Responsibilities
- Create/track orders and their statuses
- Process payments via Flutterwave (charge, verify, webhooks)
- Emit and consume domain events (RabbitMQ)
- Real-time order status updates via Socket.IO
- Centralized error handling and logging to Elasticsearch; optional APM

## Architecture & Dependencies
- Runtime: Node.js 18+, TypeScript
- Framework: Express + Socket.IO
- Database: MongoDB
- Payments: Flutterwave (`flutterwave-node-v3`)
- Messaging: RabbitMQ
- Observability: Elasticsearch + optional Elastic APM

## Ports
- HTTP/WS: 4006

## Environment Variables
Defined in `src/config.ts`:
- NODE_ENV: `development` | `production` | `test`
- API_GATEWAY_URL: Allowed CORS origin (Gateway)
- CLIENT_URL: Public client/base URL (used for redirects/links)
- JWT_TOKEN: JWT verification secret
- GATEWAY_JWT_TOKEN: Token for service-to-service calls (if applicable)
- SECRET_KEY_ONE, SECRET_KEY_TWO: Crypto/session secrets
- DATABASE_URL: MongoDB connection string (e.g., `mongodb://localhost:27017/gigconnect_orders`)
- ELASTIC_SEARCH_URL: Elasticsearch HTTP endpoint for logs
- RABBITMQ_ENDPOINT: AMQP URL (e.g., `amqp://gigconnect:Qwerty123@localhost:5672`)
- FLUTTERWAVE_SECRET_KEY: Flutterwave secret key
- FLUTTERWAVE_API_URL: Base API URL (e.g., `https://api.flutterwave.com/v3`)
- CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET: Cloudinary credentials (if storing receipts/assets)
- ENABLE_APM: `1` to enable Elastic APM
- ELASTIC_APM_SERVER_URL, ELASTIC_APM_SECRET_TOKEN: APM settings

## Socket.IO
- Created in `src/server.ts` with CORS origin `API_GATEWAY_URL`
- Use for order status updates/notifications to clients
- Horizontal scaling with multiple instances is supported; consider adding Redis adapter if multi-node fanout is required

## Message Flows (RabbitMQ)
Consumers initialized in `src/server.ts` via `order.consumer.ts`:
- `consumerReviewFanoutMessages` — reacts to review-related fanout events that may impact orders

Exchange/queue configuration is defined in the consumer/connection code.

## NPM Scripts
- dev: `nodemon`
- build: `tsc` + `tsc-alias`
- start: PM2 cluster run of compiled build
- test: Jest
- lint/format: eslint + prettier

## Running Locally

### Prerequisites
- MongoDB
- RabbitMQ
- Elasticsearch (optional) and APM (optional)
- Flutterwave test credentials

### Docker Compose (infra)
```
docker compose -f volumes/docker-compose.yaml up -d mongo rabbitmq elasticsearch kibana apm-server
```

### Configure .env
```
NODE_ENV=development
API_GATEWAY_URL=http://localhost:4000
CLIENT_URL=http://localhost:5173
JWT_TOKEN=supersecretjwt
GATEWAY_JWT_TOKEN=gateway-orders-token
SECRET_KEY_ONE=secret-one
SECRET_KEY_TWO=secret-two
DATABASE_URL=mongodb://localhost:27017/gigconnect_orders
ELASTIC_SEARCH_URL=http://elastic:admin1234@localhost:9200
RABBITMQ_ENDPOINT=amqp://gigconnect:Qwerty123@localhost:5672
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxxxxxxxxxxx-X
FLUTTERWAVE_API_URL=https://api.flutterwave.com/v3
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=
ENABLE_APM=0
ELASTIC_APM_SERVER_URL=http://localhost:8200
ELASTIC_APM_SECRET_TOKEN=
```

### Start
- Dev: `npm run dev`
- Prod: `npm run build && npm run start`

## Security
- CORS restricted to `API_GATEWAY_URL`
- Helmet & HPP enabled
- Validate Flutterwave webhooks with signature verification in production
- Store payment keys in a secure secret manager

## Observability
- Logs to Elasticsearch via `@kariru-k/gigconnect-shared`
- Elastic APM optional (`ENABLE_APM=1`)

## Troubleshooting
- Payment failures: verify `FLUTTERWAVE_SECRET_KEY` and correct API URL (test vs live)
- 401/403: verify JWT handling and gateway integration
- Mongo connectivity: check `DATABASE_URL`
- Missing logs: verify `ELASTIC_SEARCH_URL`
