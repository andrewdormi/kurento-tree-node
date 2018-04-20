const KmsModel = require('../models/kms');

class KmsStore {
    async create(data) {
        const kms = new KmsModel(data);
        await kms.save();
        return kms;
    }

    async findById(id) {
        return await KmsModel.findOne({_id: id}).populate('pipeline');
    }

    async findByUrl(url) {
        return await KmsModel.findOne({url});
    }

    async setPipeline(kms, pipeline) {
        await kms.update({$set: {pipeline}});
    }

    async setStatus(kms, status) {
        await kms.update({$set: {status}});
    }

    async clear() {
        await KmsModel.remove({});
    }

    async addWebrtc(kms, webrtc) {
        await kms.update({$addToSet: {webrtc}, $inc: {webrtcCount: 1}});
    }

    async removeWebrtc(kms, webrtc) {
        await kms.update({$pull: {webrtc}, $inc: {webrtcCount: -1}});
    }

    async findWebrtcKms(webrtc) {
        return await KmsModel.findOne({webrtc});
    }

    async getLessLoadedFromList(ids) {
        return await this.queryLessLoadedKms({_id: {$in: ids}, status: 'ready'});
    }

    async getLessLoadedExceptList(ids) {
        return await this.queryLessLoadedKms({_id: {$nin: ids}, status: 'ready'});
    }

    async getLessLoadKms() {
        return await this.queryLessLoadedKms({status: 'ready'});
    }

    async queryLessLoadedKms(query) {
        const lessLoaded = await KmsModel.find(query)
            .populate('pipeline')
            .sort({webrtcCount: 1})
            .limit(1);
        return lessLoaded[0];
    }
}

module.exports = KmsStore;