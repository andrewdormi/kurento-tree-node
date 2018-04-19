const KurentoElement = require('../domain/kurentoElement');

class KurentoUseCases {
    constructor(storeCollection, kurentoClientCollection) {
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
    }

    async registerKms({url}) {
        const {kmsStore} = this.storeCollection;
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
}

module.exports = KurentoUseCases;