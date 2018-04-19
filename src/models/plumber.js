const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const plumber = mongoose.Schema({
    callId: String,

    sourceWebrtc: {type: ObjectId, ref: 'webrtc'},
    targetWebrtc: {type: ObjectId, ref: 'webrtc'}
});

module.exports = mongoose.model('plumber', plumber);
