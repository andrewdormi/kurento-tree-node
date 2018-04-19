const KurentoClient = require('./kurentoClient');

class KurentoClientsConnection {
    constructor() {
        this.clients = {};
    }

    async getOrCreateClientWithConnection(url) {
        if (this.clients[url]) {
            return this.clients[url];
        }
        const client = new KurentoClient(url);
        await client.connect();
        this.clients[url] = client;
        return client;
    }

}

module.exports = KurentoClientsConnection;