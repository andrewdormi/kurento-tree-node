const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const kms = mongoose.Schema({
    url: {type: String, index: true, unique: true},
    status: {type: String, index: true},
    pipeline: {type: ObjectId, ref: 'pipeline'},
    webrtc: [{type: ObjectId, ref: 'webrtc'}],
    webrtcCount: {type: Number, default: 0}
});

module.exports = mongoose.model('kms', kms);
