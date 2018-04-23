class StoreCollection {
    constructor(stores) {
        this.kmsStore = stores.kmsStore;
        this.pipelineStore = stores.pipelineStore;
        this.plumberStore = stores.plumberStore;
        this.treeElementStore = stores.treeElementStore;
        this.treeStore = stores.treeStore;
        this.webrtcStore = stores.webrtcStore;
        this.treeWatchersStore = stores.treeWatchersStore;
    }
}

module.exports = StoreCollection;
