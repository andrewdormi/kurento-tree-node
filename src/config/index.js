const defaultConfig = {
    port: process.env.PORT || '8080',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/kurentotree',
    rabbitMQUrl: process.env.RABBIT_MQ_URL || 'amqp://localhost',
    treeWatcher: {
        interval: 1000,
        desiredTreeElementsCount: 4,
        desiredNumberOfElementsPerKms: 1000
    }
};

const testingConfig = {
    port: process.env.PORT || '8080',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/kurentotree',
    rabbitMQUrl: process.env.RABBIT_MQ_URL || 'amqp://localhost',
    treeWatcher: {
        interval: 1000,
        desiredTreeElementsCount: 2,
        desiredNumberOfElementsPerKms: 4
    }
};

module.exports = process.env.NODE_ENV === 'testing' ? testingConfig : defaultConfig;