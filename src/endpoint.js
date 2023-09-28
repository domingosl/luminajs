import RateLimiterMiddleware from "./middlewares/rate-limiter.js";

class Endpoint {

    constructor(app, name, logger, globalRateLimiterOptions, authMiddleware) {
        this.app = app;
        this.name = "EP:" + name;
        this.logger = logger;
        this.method = null;
        this.middlewares = [];
        this.public = false;
        this.inputFields = null;
        this.rateLimiterOptions = globalRateLimiterOptions;
        this.authMiddleware = authMiddleware;
    }

    static contextualizedLogger(context) {
        return {
            debug: (message, payload) => context.logger.debug(message, {tagLabel: context.name, payload: payload || undefined}),
            info: (message, payload) => context.logger.info(message, {tagLabel: context.name, payload: payload || undefined}),
            error: (message, payload) => context.logger.error(message, {tagLabel: context.name, payload: payload || undefined})
        }
    }

    isGet() {
        this.method = 'get';
        return this;
    }

    isPost() {
        this.method = 'post';
        return this;
    }

    isPut() {
        this.method = 'put';
        return this;
    }

    isDelete() {
        this.method = 'delete';
        return this;
    }

    isPublic() {
        this.public = true;
        return this;
    }

    respondsAt(route) {
        this.route = route;
        return this;
    }

    setMaxRequestsPerSecond(points) {
        this.rateLimiterOptions = {points, duration: 1, enabled: true};
        return this;
    }
    setController(fn) {

        const me = this;

        const ctrl = async function (req, res) {
            try {

                const logger = Endpoint.contextualizedLogger(me);
                logger.debug('Started');

                await fn({
                    req,
                    res,
                    body: req.body,
                    resolve: res.resolve,
                    forbidden: res.forbidden,
                    badRequest: res.badRequest,
                    logger});

                logger.debug('Done', { requestTime: req.locals.requestTime });


            } catch (error) {

                return res.apiErrorResponse(error, me.name);

            }
        };

        const controllersChain = this.public ? [ctrl] : [this.authMiddleware, ctrl];

        if(this.rateLimiterOptions.enabled)
            controllersChain.unshift(new RateLimiterMiddleware(this.rateLimiterOptions, this.logger).get());

        return this.app[this.method](this.route, ...controllersChain);


    }


}

export default Endpoint;
