// Mock database.ts
jest.mock('./src/database', () => {
    return {
        databaseConnection: jest.fn().mockResolvedValue(undefined),
    };
});



jest.mock('src/services/message.service');
jest.mock('@kariru-k/gigconnect-shared');
jest.mock('src/elasticsearch');
jest.mock('src/schemes/message');
jest.mock('@elastic/elasticsearch');
