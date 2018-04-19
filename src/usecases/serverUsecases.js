class ServerUsecases {
    constructor(storeCollection) {
        this.storeCollection = storeCollection;
    }

    async clear() {
        const {kmsStore, pipelineStore, treeStore, treeElementStore, webrtcStore, plumberStore} = this.storeCollection;
        await kmsStore.clear();
        await pipelineStore.clear();
        await treeStore.clear();
        await treeElementStore.clear();
        await webrtcStore.clear();
        await plumberStore.clear();
    }
}

module.exports = ServerUsecases;