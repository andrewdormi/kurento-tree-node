const TreeModel = require('../models/tree');

class TreeStore {
    async create(data) {
        const tree = new TreeModel(data);
        await tree.save();
        return tree;
    }

    async findReadyByCallId(callId) {
        return await TreeModel.findOne({callId, state: 'ready'});
    }

    async findById(id) {
        return await TreeModel.findOne({_id: id});
    }

    async addTreeElement(tree, treeElement) {
        return await TreeModel.findOneAndUpdate({_id: tree._id}, {$addToSet: {elements: treeElement}}, {new: true});
    }

    async findReadyTreeByCallIdAndLockForDeleting(callId) {
        return await TreeModel.findOneAndUpdate(
            {callId, state: 'ready'},
            {$set: {state: 'deleting-lock'}},
            {new: true}
        );
    }

    async removeByCallId(callId) {
        await TreeModel.remove({callId});
    }

    async clear() {
        await TreeModel.remove({});
    }
}

module.exports = TreeStore;