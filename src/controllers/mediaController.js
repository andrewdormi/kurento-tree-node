class MediaController {
    constructor({mediaUsecases}) {
        this.mediaUsecases = mediaUsecases;
    }

    addRoutes(socket) {
        socket.on('media:publish', this.publish.bind(this, socket));
        socket.on('media:view', this.view.bind(this, socket));
        socket.on('media:candidate:add', this.addCandidate.bind(this, socket));
        socket.on('media:remove', this.removeMedia.bind(this, socket));
    }

    async publish(socket, data, cb) {
        try {
            const {offer} = data;
            if (!offer) {
                throw {message: 'Offer missing', code: 400};
            }

            const response = await this.mediaUsecases.publish(offer, data => {
                socket.emit('media:candidate.add', data);
            });
            if (cb) cb(null, response);
        } catch (err) {
            if (cb) cb(err);
        }
    }

    async view(socket, data, cb) {
        try {
            const {offer, callId} = data;
            if (!offer) {
                throw {message: 'Offer missing', code: 400};
            }

            if (!callId) {
                throw {message: 'Call id missing', code: 400};
            }

            const response = await this.mediaUsecases.view(offer, callId, data => {
                socket.emit('media:candidate.add', data);
            });
            if (cb) cb(null, response);
        } catch (err) {
            if (cb) cb(err);
        }
    }

    async addCandidate(socket, data, cb) {
        try {
            const {elementId, candidate} = data;
            if (!elementId) {
                throw {message: 'Missing elementId', code: 400};
            }
            if (!candidate) {
                throw {message: 'Missing candidate', code: 400};
            }

            await this.mediaUsecases.addCandidate(elementId, candidate);
            if (cb) cb();
        } catch (err) {
            if (cb) cb(err);
        }
    }

    async removeMedia(socket, data, cb) {
        try {
            const {elementId} = data;
            if (!elementId) {
                throw {message: 'Missing elementId', code: 400};
            }

            await this.mediaUsecases.remove(elementId);
        } catch (err) {
            if (cb) cb(err);
        }
    }
}

module.exports = MediaController;