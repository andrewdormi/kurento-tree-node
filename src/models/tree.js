const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const TREE_WIDTH = 2; // binary tree

const tree = mongoose.Schema({
    callId: {type: String, index: true, unique: true},
    elements: [{type: ObjectId, ref: 'treeElement'}],

    state: {type: String, default: 'ready'}
});

tree.methods.getParentElementId = function (treeElement) {
    const index = this.elements.findIndex(e => e.equals(treeElement._id));
    return this.elements[Math.floor((index - 1) / TREE_WIDTH)];
};

module.exports = mongoose.model('tree', tree);
