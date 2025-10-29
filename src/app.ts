import {databaseConnection} from "./database";
import {config} from "./config";
import express, {Express} from "express";
import {start} from "./server";

const initialize = (): void => {
    config.cloudinaryConfig();
    databaseConnection();
    const app: Express = express();
    start(app);
}

initialize();
