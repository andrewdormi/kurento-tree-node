class ServerController {
    constructor({serverUsecases}) {
        this.serverUsecases = serverUsecases;
    }

    addSocket(socket) {
        socket.on('server:clear', this.clear.bind(this, socket));
    }

    async clear(socket, data, cb) {
        try {
            await this.serverUsecases.clear();
            if (cb) cb();
        } catch (err) {
            if (cb) cb(err);
        }
    }
}

module.exports = ServerController;