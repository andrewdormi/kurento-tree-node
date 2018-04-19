const mongoConnect = require('./src/db/mongo');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const HttpServer = require('./src/engine/httpServer');
const SocketServer = require('./src/engine/socketServer');

global.config = config;
global.logger = logger;

(async function () {
    await mongoConnect();

    const httpServer = new HttpServer();
    const socketServer = new SocketServer(httpServer);
})();