import {
    IAuthPayload,
    IDeliveredWork,
    IExtendedDelivery, IFlutterwaveDetails,
    IMessageDocument,
    IOffer,
    IOrderDocument, IOrderEvents
} from "@kariru-k/gigconnect-shared";
import {Response} from "express";

export const orderMockRequest = (sessionData: IJWT, body: IMessageDocument, currentUser?: IAuthPayload | null, params?: IParams) => ({
    session: sessionData, body, params, currentUser
});

export const orderMockResponse = (): Response => {
    const res: Response = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

export interface IJWT {
    jwt?: string;
}

export const authUserPayload: IAuthPayload = {
    id: 2, username: 'Danny', email: 'danny@me.com', iat: 12345
};

export interface IParams {
    username?: string;
}

export const mockOrderDocument: IOrderDocument = {
    // --- OFFER DETAILS ---
    offer: {
        gigTitle: 'Professional Logo Design Package',
        price: 500,
        description: 'A complete logo design with 3 revisions and source files.',
        deliveryInDays: 7,
        oldDeliveryDate: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString(), // 3 days ago
        newDeliveryDate: new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)).toISOString(), // 4 days from now
        accepted: true,
        cancelled: false,
        reason: undefined,
    } as IOffer, // Casting to IOffer to satisfy the index signature

    // --- GIG & SELLER DETAILS ---
    gigId: '654a1d821a8d4b3b08e5e1c0',
    sellerId: '654a1d821a8d4b3b08e5e1c1',
    sellerUsername: 'prodesigner',
    sellerImage: 'https://cdn.example.com/seller_prodesigner.jpg',
    sellerEmail: 'seller@example.com',
    gigCoverImage: 'https://cdn.example.com/logo_design_cover.jpg',
    gigMainTitle: 'High-Quality Custom Logo Design',
    gigBasicTitle: 'Basic Package',
    gigBasicDescription: 'One concept, 3 days delivery.',

    // --- BUYER DETAILS ---
    buyerId: '654a1d821a8d4b3b08e5e1c2',
    buyerUsername: 'clientbuyer',
    buyerEmail: 'buyer@example.com',
    buyerImage: 'https://cdn.example.com/buyer_clientbuyer.jpg',

    // --- ORDER STATUS & DETAILS ---
    status: 'In Progress', // 'Completed', 'Delivered', 'Cancelled'
    orderId: 'T-20231030-10000000',
    invoiceId: 'INV-2023-5555',
    quantity: 1,
    price: 500, // The base price for the service
    serviceFee: 50, // Calculated service fee (e.g., 10% of price)
    requirements: 'Need a minimalist logo for a tech startup called "NovaSoft". Primary color: blue.',

    // --- OPTIONAL STATUS/HISTORY FIELDS ---
    approved: true,
    cancelled: false,
    delivered: false,
    approvedAt: new Date().toISOString(),
    dateOrdered: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 days ago

    // --- DELIVERY EXTENSION (MOCK INITIATED) ---
    requestExtension: {
        originalDate: '2025-11-05',
        newDate: '2025-11-08',
        days: 3,
        reason: 'Seller requested extra time due to complexity of revision.',
        deliveryDateUpdate: new Date().toISOString(),
    } as IExtendedDelivery,

    // --- DELIVERED WORK (MOCK PENDING) ---
    deliveredWork: [{
        message: 'Final logo files attached. Let me know if you have any feedback!',
        file: 'https://cdn.example.com/deliveries/novasoft_final.zip',
        fileType: 'application/zip',
        fileSize: 1524100, // 1.5MB
        fileName: 'NovaSoft_Logo_Final.zip',
    }] as IDeliveredWork[],

    // --- ORDER EVENTS ---
    events: {
        placeOrder: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString(),
        requirements: new Date(Date.now() - (6 * 24 * 60 * 60 * 1000)).toISOString(),
        orderStarted: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString(),
        deliveryDateUpdate: new Date().toISOString(),
        // orderDelivered: undefined, // Leave undefined if status is 'In Progress'
    } as IOrderEvents,

    // --- REVIEWS ---
    buyerReview: undefined,
    sellerReview: undefined,

    // --- PAYMENT DETAILS ---
    flutterwave: {
        txRef: 'FLW_TX_REF_12345678',
        transactionId: '123456',
        gatewayStatus: 'successful',
        paymentMethod: 'card',
        fee: 20,
    } as IFlutterwaveDetails,
    paymentIntent: 'pi_3P5bNfJq1C7S8kI9L0oP2qR3',
};
