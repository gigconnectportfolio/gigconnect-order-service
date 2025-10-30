import express, {Router} from "express";
import {health} from "../controllers/health";

const router: Router = express.Router();

export function healthRoutes(): Router {
    router.get('/order-health', health);
    return router;
}


