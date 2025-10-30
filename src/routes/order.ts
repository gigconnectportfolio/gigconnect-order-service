import {Router} from "express";
import {buyerOrders, orderId, sellerOrders} from "../controllers/order/get";
import {order} from "../controllers/order/create";
import {
    buyerApproveOrder,
    cancel,
    deliverOrder, deliveryDate,
    requestExtension,
    verifyOrderController
} from "../controllers/order/update";
import {notifications} from "../controllers/notifications/get";
import {markNotificationAsRead} from "../services/notification.service";

const router: Router = Router();

export const orderRoutes = (): Router => {
    router.get('/notification/:userTo', notifications);
    router.get('/:orderId', orderId);
    router.get('/seller/:sellerId', sellerOrders);
    router.get('/buyer/:buyerId', buyerOrders);
    router.post('/', order);
    router.put('/cancel/:orderId', cancel);
    router.put('/verify/:transactionId/:tx_ref', verifyOrderController);
    router.put('extension/:orderId', requestExtension);
    router.put('deliver-order/:orderId', deliverOrder);
    router.put('/approve-order/:orderId', buyerApproveOrder);
    router.put('/gig/:type/:orderId', deliveryDate);
    router.put('/notification/mark-as-read', markNotificationAsRead);

    return router;
}
