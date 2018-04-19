class KmsController {
    constructor({kurentoUsecases}) {
        this.kurentoUsecases = kurentoUsecases;
    }

    addRoutes(socket) {
        socket.on('kms:register', this.registerKms.bind(this, socket));
    }

    async registerKms(socket, data, cb) {
        try {
            const {url} = data;
            if (!url) {
                throw {message: 'Missing kms url', code: 400};
            }

            await this.kurentoUsecases.registerKms({url});
            if (cb) cb();
        } catch (err) {
            if (cb) cb(err);
        }
    }
}

module.exports = KmsController;