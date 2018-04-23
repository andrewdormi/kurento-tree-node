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
        const updatedTree = await this.findById(tree._id);
        const newElements = updatedTree.elements;
        const firstNullIndex = newElements.findIndex(e => !e);
        if (firstNullIndex !== -1) {
            newElements[firstNullIndex] = treeElement._id;
        } else {
            newElements.push(treeElement._id);
        }

        return await TreeModel.findOneAndUpdate({_id: tree._id}, {$set: {elements: newElements}}, {new: true});
    }

    async removeTreeElement(tree, treeElement) {
        const updatedTree = await this.findById(tree._id);
        const newElements = updatedTree.elements;
        const oldElementIndex = newElements.findIndex(e => e.equals(treeElement._id));
        if (oldElementIndex !== -1) {
            newElements[oldElementIndex] = null;
        }

        return await TreeModel.findOneAndUpdate({_id: tree._id}, {$set: {elements: newElements}}, {new: true});
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