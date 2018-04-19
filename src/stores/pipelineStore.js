const PipelineModel = require('../models/pipeline');

class PipelineStore {
    async create(data) {
        const pipeline = new PipelineModel(data);
        await pipeline.save();
        return pipeline;
    }

    async clear() {
        await PipelineModel.remove({});
    }
}

module.exports = PipelineStore;