export default (logger) => (req, res, next) => {

    function prepare(data) {
        if(data && typeof data.getPublicFields === 'function')
            data = data.getPublicFields();

        if(data && typeof data.toJSON === 'function')
            data = data.toJSON();


        return data;
    }

    function getForm(code, payload = {}, message = "") {

        let response = {code};

        if (Array.isArray(payload))
            payload = payload.map(row => prepare(row));
        else
            payload = prepare(payload);

        if(payload)
            response.data = payload;
        if(message)
            response.message = message;
        if(pagination)
            response.pagination = pagination;

        response.requestTime = (new Date().getTime() - req.locals.requestStart) + "ms";
        req.locals.requestTime = response.requestTime;
        return res.status(code).json(response);

    }

    let pagination;
    if(!req.locals)
        req.locals = {};

    req.locals.requestStart = new Date().getTime();

    res.setPagination = (p) => {
        pagination = p;
        return res;
    };

    res.resolve = (payload) => getForm(200, payload);
    res.badRequest = (payload) => getForm(400, payload);
    res.unauthorized = (message) => getForm(401, null, message);
    res.forbidden = (message) => getForm(403, null, message);
    res.conflict = (reason, message) => getForm(409, { reason }, message);
    res.notFound = () => getForm(404, null, null);
    res.applicationError = (message = null) => getForm(500, null, message);
    res.tooManyRequests = (message) => getForm(429, null, message);
    res.timeout = (message) => getForm(408, null, message);
    res.unavailable = (message) => getForm(503, null, message);
    res.aggregationResolve = (payload) => { return res.status(200).json({code: 200, ...payload}); };
    res.apiErrorResponse = (error, ctrlName) => {

        if(error && error.name === 'ValidationError')
            return getForm(400, error.data);

        if(error && error.name === 'ForbiddenError')
            return getForm(403, null, error.message);

        if (error && error.name === 'ConflictError')
            return getForm(409, { reason: error.reason });

        logger.error("Controller crash", { tagLabel: ctrlName });
        console.log(error);
        return getForm(500, null, null);

    };

    next();
};