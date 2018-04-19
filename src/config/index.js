module.exports = {
    port: process.env.PORT || '8080',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/kurentotree',
    treeWatcher: {
        interval: 1000,
        desiredInitialTreeElements: 5
    }
};