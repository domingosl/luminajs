import express from "express";
import cors from 'cors';
import bodyParser from 'body-parser';
import BaseMiddleware from "./middlewares/base.js";
import AuthMiddleware from "./middlewares/auth/index.js";
import Logger from "./logger.js";
import Endpoint from "./endpoint.js";
import Joi from 'joi';
import appRoot from 'app-root-path';


const tagLabel = 'luminaServer';

const configSchema = Joi.object({
    port: Joi.number().default(3000),
    cors: Joi.bool().default(true),
    debug: Joi.bool().default(false),
    logsRootDirectory: Joi.string().default(appRoot.path),
    requestBodyMaxSize: Joi.string().default('100kb'),
    globalRateLimiter: Joi.object({
        enabled: Joi.bool().default(true),
        points: Joi.number().default(10),
        duration: Joi.number().default(1) //Seconds
    }).default(),
    cb: Joi.custom((fn, helper) => typeof fn === 'function' ? true : helper.message('"cb" is not a function'))
});


export default class Server {

    constructor(_options) {

        const { error, value:options } = configSchema.validate(_options);

        this.options = options;

        let loggers = new Logger({ onlyConsole: true, debug: true });
        this.logger = loggers.getApplicationLogger();

        if(error) {
            this.logger.error(error.message, {tagLabel});
            process.exit();
        }

        loggers = new Logger({
            logsRootDirectory: options.logsRootDirectory,
            onlyConsole: false,
            debug: options.debug });

        this.logger = loggers.getApplicationLogger();

        this.port = options.port;

        this.expressApp = express();

        this.expressApp.use(bodyParser.urlencoded({
            limit: this.options.requestBodyMaxSize,
            extended: false
        }));

        this.expressApp.use(bodyParser.json({
            limit: this.options.requestBodyMaxSize
        }));

        this.options.cors && this.expressApp.use(cors());


        this.expressApp.use(loggers.getHttpStream());


        this.expressApp.use(BaseMiddleware(this.logger));

        this.expressApp.listen(this.port, ()=>{

            this.logger.info("Api server ready", { tagLabel, payload: { port: options.port } });
            options.cb && options.cb();


        })

    }

    newEndpoint(name) {
        return new Endpoint(this.expressApp, name, this.logger, this.options.globalRateLimiter, AuthMiddleware(this.logger))
    }

}
