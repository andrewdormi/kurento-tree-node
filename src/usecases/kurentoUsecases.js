const KurentoElement = require('../domain/kurentoElement');

class KurentoUseCases {
    constructor(storeCollection, kurentoClientCollection) {
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
    }

    async registerKms({url}) {
        const {kmsStore} = this.storeCollection;
        const existed = await kmsStore.findByUrl(url);
        if (existed) {
            throw {message: 'Kms with this url is already registered', code: 400};
        }
        const kms = await kmsStore.create({url, status: 'initiating'});

        const pipeline = new KurentoElement({
            kms,
            elementType: 'MediaPipeline',
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
        await pipeline.save();

        await kmsStore.setStatus(kms, 'ready');
    }

    async deregisterKms({url}) {
        const {kmsStore, pipelineStore} = this.storeCollection;
        const existedKms = await kmsStore.findByUrl(url);
        if (!existedKms) {
            throw {message: 'Cant find existed kms', code: 400};
        }

        if (existedKms.webrtcCount > 0) {
            throw {message: 'Not empty instance', code: 400};
        }

        const client = await this.kurentoClientCollection.getOrCreateClientWithConnection(existedKms.url);
        const {element: pipeline} = await client.retrive(existedKms.pipeline.elementId);

        await pipelineStore.remove(existedKms.pipeline);
        await kmsStore.remove(existedKms);
        await pipeline.release()
    }
}

module.exports = KurentoUseCases;