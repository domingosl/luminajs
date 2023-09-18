import { createLogger, format, transports } from 'winston';
import process from 'node:process';
import path from 'node:path';
import chalk from 'chalk';
import morgan from 'morgan';

import 'winston-daily-rotate-file';

const { combine, timestamp, printf } = format;


class Logger {

    constructor({logsRootDirectory, onlyConsole, debug}) {

        this.options = {};

        this.options.console = {
            level: debug ? 'debug' : 'info',
            handleExceptions: true,
            format: combine(timestamp({format: 'HH:mm:ss'}), format.splat(), format.simple(), Logger.cFormat())
        };

        if(!onlyConsole) {
            this.options.fileInfo = {
                level: 'info',
                handleExceptions: true,
                json: true,
                filename: path.join(logsRootDirectory, '/logs/app-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: false,
                maxSize: '20m',
                maxFiles: '14d',
                format: combine(timestamp(), format.splat(), format.simple(), Logger.fFormat())
            };

            this.options.fileHttp = {
                level: 'info',
                filename: path.join(logsRootDirectory, '/logs/http-%DATE%.log'),
                handleExceptions: true,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: false,
                maxSize: '20m',
                maxFiles: '14d',
                format: combine(format.json())
            };

            this.options.fileError = {
                level: 'error',
                filename: path.join(logsRootDirectory, '/logs/error-%DATE%.log'),
                handleExceptions: true,
                json: true,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: false,
                maxSize: '20m',
                maxFiles: '14d',
                format: combine(timestamp(), format.splat(), format.simple(), Logger.fFormat())
            };

            this.applicationLogger = createLogger({
                transports: [
                    new transports.Console(this.options.console),
                    new transports.DailyRotateFile(this.options.fileInfo),
                    new transports.DailyRotateFile(this.options.fileError)
                ],
                exitOnError: false
            });


            this.expressLogger = createLogger({
                transports: [
                    new transports.DailyRotateFile(this.options.fileHttp)
                ]
            });
        }
        else {

            this.applicationLogger = createLogger({
                transports: [
                    new transports.Console(this.options.console)
                ],
                exitOnError: false
            });
        }

    }

    static fFormat() {
        return printf(info => {
            return JSON.stringify({ process: process.title, pid: process.pid, level: info.level, tagLabel: info.tagLabel || null, timestamp: info.timestamp, message: info.message, payload: Logger.extractRelevant(info) });
        });
    };

    static cFormat() {
        return printf(info => {

        let level = (info.level === 'debug') ?
            chalk.black.bgYellow(" DEBUG ") :
            info.level === 'info' ?
                chalk.black.bgBlue(" INFO  ") :
                info.level === 'error' ?
                    chalk.black.bgRed(" ERROR ") :
                    info.level === 'warn' ?
                        chalk.black.bgMagenta(" WARN  ") :
                    chalk.black.magenta((info.level).toUpperCase());


        if(typeof info.message === 'object')
            info.message = JSON.stringify(info.message);

        const relevantPayload = Logger.extractRelevant(info);

        return info.timestamp + " | " + level + " | " + (info.tagLabel ? chalk.dim(info.tagLabel.substring(0,20).padEnd(20)) : "anonymous".padEnd(20)) + " | " + info.message + ( relevantPayload ? " | " + relevantPayload : "") ;
    }) };

    static extractRelevant(info) {

        if(typeof info !== 'object')
            return info;

        let obj = {};

        for (let key in info) {
            if (info.hasOwnProperty(key)) {
                if(key === 'error') {

                    if(info[key] instanceof Error) {
                        obj[key] = typeof info[key] === 'object' ? JSON.stringify(info[key], Object.getOwnPropertyNames(info[key])) : info[key];
                    } else
                        obj[key] = info[key];

                }
                else if(key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== 'tagLabel')
                    obj[key] = info[key];
            }
        }

        if(Object.keys(obj).length === 1 && obj.hasOwnProperty('payload') && obj.payload === undefined)
            return "";
        else if(Object.keys(obj).length === 1 && obj.hasOwnProperty('payload') && obj.payload !== undefined)
            obj = obj.payload;

        return JSON.stringify(obj, Logger.censor(obj));
    };

    static objColor(obj) {

        let response = '';
        const iterate = (el) => {
            Object.keys(el).forEach(key => {

                if (!el.hasOwnProperty(key))
                    return;

                response += key + ": " + el[key];

            })
        }

        iterate(obj);

        return response;

    }

    static censor(censor) {
        let i = 0;

        return function(key, value) {
            if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor === value)
                return '[Circular]';

            if(i >= 29)
                return '[Unknown]';

            ++i;

            return value;
        }
    }

    getHttpStream() {

        return morgan("combined", {"stream": {
                write: (message) => {
                    this.expressLogger.info(message);
                },
            }})
    }

    getApplicationLogger() {
        return this.applicationLogger;
    }

}

export default Logger;
