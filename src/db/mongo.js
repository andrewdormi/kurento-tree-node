const mongoose = require('mongoose');

function connect() {
    return new Promise(resolve => {
        mongoose.connect(config.mongoUrl, {
            promiseLibrary: global.Promise,
            reconnectTries: Number.MAX_VALUE,
            autoReconnect: true,
            reconnectInterval: 5000
        });
        const db = mongoose.connection;
        db.on('error', console.error.bind(console, 'Mongo connection error:'));
        db.once('open', async () => {
            resolve();
        });
    });
}

module.exports = connect;
