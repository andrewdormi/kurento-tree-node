const kurento = require('kurento-client');
const {wrap} = require('../utils/promiseWrapper');

class KurentoClient {
    constructor(url) {
        this.url = url;
        this.connection = null;
    }

    async connect() {
        if (!this.connection) {
            const connectionWrapped = await wrap(kurento(this.url));
            this.connection = connectionWrapped.get();
        }
    }

    async createElement(type, client) {
        client = client || this.connection;
        const elementWrapped = await wrap(client.create(type));
        return {element: elementWrapped.get()};
    }

    async retrive(elementId) {
        let elementWrapped = null;
        try {
            elementWrapped = await wrap(this.connection.getMediaobjectById(elementId));
        } catch (err) {
            return {element: null};
        }
        return {element: elementWrapped.get()};
    };

}

module.exports = KurentoClient;
