module.exports = {
    port: process.env.PORT || '8080',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/kurentotree',
    rabbitMQUrl: process.env.RABBIT_MQ_URL || 'amqp://localhost',
    treeWatcher: {
        interval: 1000,
        desiredTreeElementsCount: 3,
        desiredNumberOfElementsPerKms: 10
    }
};