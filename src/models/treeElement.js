const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const treeElement = mongoose.Schema({
    callId: {type: String, index: true},
    kms: {type: ObjectId, ref: 'kms', index: true},
    webrtc: [{type: ObjectId, ref: 'webrtc'}],

    incomingPlumber: {type: ObjectId, ref: 'plumber'},
    outgoingPlumbers: [{type: ObjectId, ref: 'plumber'}],

    state: {type: String, default: 'ready'}
});

treeElement.index({kms: 1, callId: 1}, {unique: true});


module.exports = mongoose.model('treeElement', treeElement);
