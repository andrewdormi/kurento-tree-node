const mongoose = require('mongoose');

const pipeline = mongoose.Schema({
    elementId: String
});

module.exports = mongoose.model('pipeline', pipeline);
