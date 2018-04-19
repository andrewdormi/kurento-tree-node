const mongoose = require('mongoose');

const webrtc = mongoose.Schema({
    elementId: {type: String, index: true, unique: true},
    callId: {type: String, index: true},
    streamType: String
});

module.exports = mongoose.model('webrtc', webrtc);
