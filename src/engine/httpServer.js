const express = require('express');

class HttpServer {
    constructor() {
        this.app = express();
        this.server = this.createSimpleServer();
        this.server.listen(config.port);
        logger.info(`Server started on port ${config.port}`);
    }
    
    createSimpleServer() {
        return require('http').createServer(this.app);
    }
}

module.exports = HttpServer;