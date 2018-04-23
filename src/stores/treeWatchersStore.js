const TreeWatchersModel = require('../models/treeWatchers');

class TreeWatchersStore {
    async create(data) {
        const treeWatcher = new TreeWatchersModel(data);
        await treeWatcher.save();
        return treeWatcher;
    }

    async markStoppedByCallIds(callIds) {
        return await TreeWatchersModel.update({callId: {$in: callIds}}, {$set: {state: 'stopped'}});
    }

    async findOneNotWorking() {
        return await TreeWatchersModel.findOneAndUpdate({state: 'stopped'}, {$set: {state: 'processing'}}, {new: true});
    }

    async createOrSetWorkingForCallId(callId) {
        return await TreeWatchersModel.findOneAndUpdate({callId}, {$set: {state: 'working'}}, {upsert: true});
    }

    async removeWatcherByCallId(callId) {
        return await TreeWatchersModel.remove({callId});
    }

    async clear() {
        await TreeWatchersModel.remove({});
    }
}

module.exports = TreeWatchersStore;