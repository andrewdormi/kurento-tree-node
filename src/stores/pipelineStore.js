const PipelineModel = require('../models/pipeline');

class PipelineStore {
    async create(data) {
        const pipeline = new PipelineModel(data);
        await pipeline.save();
        return pipeline;
    }

    async findAll() {
        return PipelineModel.find({});
    }

    async remove(pipeline) {
        return PipelineModel.remove({_id: pipeline._id});
    }

    async clear() {
        await PipelineModel.remove({});
    }
}

module.exports = PipelineStore;