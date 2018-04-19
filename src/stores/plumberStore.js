const PlumberModel = require('../models/plumber');

class PlumberStore {
    async create(data) {
        const plumber = new PlumberModel(data);
        await plumber.save();
        return plumber;
    }

    async findById(id) {
        return await PlumberModel.findOne({_id: id});
    }

    async clear() {
        await PlumberModel.remove({});
    }
}

module.exports = PlumberStore;