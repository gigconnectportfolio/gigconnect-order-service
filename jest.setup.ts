// Mock database.ts
jest.mock('./src/database', () => {
    return {
        databaseConnection: jest.fn().mockResolvedValue(undefined),
    };
});



jest.mock('src/services/notification.service');
jest.mock('src/services/order.service');
jest.mock('@kariru-k/gigconnect-shared');
jest.mock('src/elasticsearch');
jest.mock('src/models/notification.schema');
jest.mock('src/models/order.schema');
jest.mock('@elastic/elasticsearch');
