class ServerUsecases {
    constructor(storeCollection, kurentoClientCollection) {
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
    }

    async clear() {
        const {kmsStore, pipelineStore, treeStore, treeElementStore, webrtcStore, plumberStore} = this.storeCollection;
        const pipelines = await pipelineStore.findAll();
        for (let i = 0; i < pipelines.length; i++) {
            await this.releasePipelineElement(pipelines[i]);
        }

        const webrtcs = await webrtcStore.findAll();
        for (let i = 0; i < webrtcs.length; i++) {
            await this.releaseWebrtcElement(webrtcs[i]);
        }

        await kmsStore.clear();
        await pipelineStore.clear();
        await treeStore.clear();
        await treeElementStore.clear();
        await webrtcStore.clear();
        await plumberStore.clear();
    }

    async releaseWebrtcElement(model) {
        const {kmsStore} = this.storeCollection;
        const kms = await kmsStore.findWebrtcKms(model);
        const kmsClient = await this.kurentoClientCollection.getOrCreateClientWithConnection(kms.url);
        const {element} = await kmsClient.retrive(model.elementId);
        if (element) {
            await element.release();
        }
    }

    async releasePipelineElement(model) {
        const {kmsStore} = this.storeCollection;
        const kms = await kmsStore.findPipelineKms(model);
        const kmsClient = await this.kurentoClientCollection.getOrCreateClientWithConnection(kms.url);
        const {element} = await kmsClient.retrive(model.elementId);
        if (element) {
            await element.release();
        }
    }
}

module.exports = ServerUsecases;