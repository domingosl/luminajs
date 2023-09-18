export default logger => (req, res, next) => {

    logger.debug("todo!")
    next();

};
