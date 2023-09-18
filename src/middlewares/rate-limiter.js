import { RateLimiterMemory } from "rate-limiter-flexible";

const tagLabel = 'rateLimiter';

class RateLimiterMiddleware {

    constructor(options, logger) {

        this.options = options;
        this.rateLimiter = new RateLimiterMemory({
            points: this.options.points,
            duration: this.options.duration
        });
        this.logger = logger;
    }

    get() {
        return (req, res, next) => {
            this.rateLimiter.consume(req.ip)
                .then(() => {
                    next();
                })
                .catch(() => {
                    res.tooManyRequests('Too Many Requests');
                    this.logger.warn("Too many requests", { tagLabel, ip: req.ip, url: req.url })
                });
        };
    }

}
export default RateLimiterMiddleware;
