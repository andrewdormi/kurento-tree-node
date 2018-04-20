const TreeElementModel = require('../models/treeElement');

class TreeElementStore {
    async create(data) {
        const treeElement = new TreeElementModel(data);
        await treeElement.save();
        return treeElement;
    }

    async findReadyById(id) {
        return await TreeElementModel.findOne({_id: id, state: 'ready'});
    }

    async findReadyByIds(ids) {
        return await TreeElementModel.find({_id: {$in: ids}, state: 'ready'});
    }

    async findByCallIdAndKms(callId, kms) {
        return await TreeElementModel.findOne({callId, kms});
    }

    async findByCallId(callId) {
        return await TreeElementModel.find({callId});
    }

    async findWithWebrtc(webrtc) {
        return await TreeElementModel.findOne({webrtc});
    }

    async addWebrtc(treeElement, webrtc) {
        return await treeElement.update({$addToSet: {webrtc}});
    }

    async removeWebrtc(treeElement, webrtc) {
        return await treeElement.update({$pull: {webrtc}});
    }

    async setIncomingPlumber(treeElement, incomingPlumber) {
        return await treeElement.update({$set: {incomingPlumber}});
    }

    async addOutgoingPlumber(treeElement, outgoingPlumber) {
        return await treeElement.update({$addToSet: {outgoingPlumbers: outgoingPlumber}});
    }

    async setState(treeElement, state) {
        return await treeElement.update({$set: {state}});
    }

    async clear() {
        await TreeElementModel.remove({});
    }
}

module.exports = TreeElementStore;