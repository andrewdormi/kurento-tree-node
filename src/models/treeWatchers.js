const mongoose = require('mongoose');

const treeWatcher = mongoose.Schema({
    callId: {type: String, index: true, unique: true},

    state: {type: String, default: 'working'}
});

module.exports = mongoose.model('treeWatcher', treeWatcher);
