import Lumina from './src/index.js';

const apiServer = new Lumina({
    port: 3000,
    //logsRootDirectory: '/Users/user/WebstormProjects/luminajs',
/*    globalRateLimiter: {
        points: 10,
        duration: 1
    },*/
    debug: true
});

apiServer.newEndpoint('status')
    .isGet()
 /*   .isPublic()*/
    .respondsAt('/status')
    .setMaxRequestsPerSecond(2)
    .setController(
        ({resolve, logger}) => {
            logger.debug("Some data here!", { foo: 123 });
            //throw new Error("ops!");
            resolve("Hello!");
        });

