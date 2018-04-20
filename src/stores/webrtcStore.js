const WebrtcModel = require('../models/webrtc');

class WebrtcStore {
    async create(data) {
        const webrtc = new WebrtcModel(data);
        await webrtc.save();
        return webrtc;
    }

    async findById(id) {
        return await WebrtcModel.findOne({_id: id});
    }

    async findByCallId(callId) {
        return await WebrtcModel.find({callId});
    }

    async findByElementId(elementId) {
        return await WebrtcModel.findOne({elementId});
    }

    async removeByCallId(callId) {
        await WebrtcModel.remove({callId});
    }

    async findAll() {
        return WebrtcModel.find({});
    }

    async clear() {
        await WebrtcModel.remove({});
    }
}

module.exports = WebrtcStore;