const socketIO = require('socket.io');
const IOController = require('../controllers/ioController');

class SocketServer {
    constructor(httpServer) {
        this.httpServer = httpServer.server;
        this.socketServer = socketIO.listen(this.httpServer);
        this.ioController = new IOController(this.socketServer);
    }
}

module.exports = SocketServer;
