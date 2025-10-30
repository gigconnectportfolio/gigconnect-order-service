import { order } from '../create';
import { Request, Response} from 'express';
import { IOrderDocument} from '@kariru-k/gigconnect-shared';
import { StatusCodes } from 'http-status-codes';
import { mockOrderDocument, orderMockResponse, orderMockRequest, authUserPayload } from './mocks/order.mock';

import { orderSchema } from '../../../schemes/order';
import * as orderService from '../../../services/order.service';
import * as helper from '@kariru-k/gigconnect-shared';

// Global constants for mocking
const mockTxRef = 'TX-MOCK-ABC12345';
const originalPrice = mockOrderDocument.price; // Capture original price for reset

// --- TEST SUITE ---
describe('Order Controller: order', () => {

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Reset mockOrderDocument price to original after each test
        mockOrderDocument.price = originalPrice;
        jest.clearAllMocks();
    })

    // --- TEST CASE 1: SUCCESS - HIGH PRICE SCENARIO (10% FEE) ---
    it('should successfully create an order with a 10% service fee for price >= 1000', async () => {
        const inputPrice = 2500;
        const expectedFee = 250; // Math.round(2500 * 0.1)

        // Clone and modify the mock document directly for the request body
        const reqBody: IOrderDocument = JSON.parse(JSON.stringify(mockOrderDocument));
        reqBody.price = inputPrice;

        const req: Request = orderMockRequest({}, reqBody as any, authUserPayload) as unknown as Request;
        const res: Response = orderMockResponse();
        const next: jest.Mock = jest.fn();

        const mockCreatedOrder = {
            ...mockOrderDocument,
            serviceFee: expectedFee,
            _id: 'new-db-id-1',
            txRef: mockTxRef // ADDED: Required by service return type
        } as IOrderDocument & { txRef: string };

        jest.spyOn(orderSchema, 'validate').mockImplementation((): any => Promise.resolve({ error: {} }));
        jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockCreatedOrder);

        await order(req, res, next);

        expect(orderSchema.validate).toHaveBeenCalledWith(req.body);
        expect(orderService.createOrder).toHaveBeenCalledWith({ ...reqBody, serviceFee: expectedFee });
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Order created successfully',
            order: mockCreatedOrder,
        });
        expect(next).not.toHaveBeenCalled();
    });

    // --- TEST CASE 2: SUCCESS - LOW PRICE SCENARIO ($100 FEE) ---
    it('should successfully create an order with a fixed $100 service fee for price < 1000', async () => {
        const inputPrice = 850;
        const expectedFee = 100;

        // Clone and modify the mock document directly for the request body
        const reqBody: IOrderDocument = JSON.parse(JSON.stringify(mockOrderDocument));
        reqBody.price = inputPrice;

        const req: Request = orderMockRequest({}, reqBody as any, authUserPayload) as unknown as Request;
        const res: Response = orderMockResponse();
        const next: jest.Mock = jest.fn();

        const mockCreatedOrder = {
            ...mockOrderDocument,
            serviceFee: expectedFee,
            _id: 'new-db-id-2',
            txRef: mockTxRef // ADDED: Required by service return type
        } as IOrderDocument & { txRef: string };

        jest.spyOn(orderSchema, 'validate').mockImplementation((): any => Promise.resolve({ error: {} }));
        jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockCreatedOrder);

        await order(req, res, next);

        expect(orderService.createOrder).toHaveBeenCalledWith({ ...reqBody, serviceFee: expectedFee });
        expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Order created successfully',
            order: mockCreatedOrder,
        });
        expect(next).not.toHaveBeenCalled();
    });

    // --- TEST CASE 3: VALIDATION ERROR ---
    it('should throw BadRequestError and call next() if validation fails', async () => {
        const req: Request = orderMockRequest({}, {} as any, authUserPayload) as unknown as Request;
        const res: Response = orderMockResponse();
        const next: jest.Mock = jest.fn();

        jest.spyOn(orderSchema, 'validate').mockImplementation((): any => Promise.resolve({
            error: {
                name: 'ValidationError', isJoi: true, details: [{message: 'This is an error message'}]
            }
        }));

        order(req, res, next).catch(() => {
            expect(helper.BadRequestError).toHaveBeenCalledWith('This is an error message', 'Create message() method');
        });
    });

    // --- TEST CASE 4: INTERNAL SERVER ERROR ---
    it('should catch internal errors during createOrder and pass them to next()', async () => {
        const internalError = new Error('Database connection failed');
        const inputPrice = 1500;

        // Clone and modify the mock document directly for the request body
        const reqBody: IOrderDocument = JSON.parse(JSON.stringify(mockOrderDocument));
        reqBody.price = inputPrice;

        const req: Request = orderMockRequest({}, reqBody as any, authUserPayload) as unknown as Request;
        const res: Response = orderMockResponse();
        const next: jest.Mock = jest.fn();

        jest.spyOn(orderSchema, 'validate').mockImplementation((): any => Promise.resolve({ error: {} }));
        jest.spyOn(orderService, 'createOrder').mockRejectedValue(internalError);

        await order(req, res, next);

        expect(orderService.createOrder).toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(internalError);
        expect(res.status).not.toHaveBeenCalled();
    });
});
