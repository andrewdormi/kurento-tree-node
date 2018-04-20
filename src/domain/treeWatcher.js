const kurento = require('kurento-client');
const treeWatcherStates = {working: 'working', stopped: 'stopped'};

// Watcher for creating/balancing current broadcasting tree
class TreeWatcher {
    constructor({tree, storeCollection, kurentoClientCollection}) {
        this.tree = tree;
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
    }

    async start() {
        this.state = treeWatcherStates.working;
        this.isTickProcessing = false;
        await this.tick();
    }

    async stop() {
        return new Promise(resolve=> {
            clearTimeout(this.watcherTimeout);
            this.stoppingCallback = resolve;
            this.state = treeWatcherStates.stopped;
            if (!this.isTickProcessing) {
                this.stoppingCallback();
            }
        });
    }

    async tick() {
        this.isTickProcessing = true;
        const {treeStore} = this.storeCollection;
        const tree = await treeStore.findById(this.tree._id);

        const differenceWithDesiredElementsNumber = tree.elements.length - config.treeWatcher.desiredInitialTreeElements;
        if (differenceWithDesiredElementsNumber < 0) {
            await this.createDesiredInitialTreeElements(Math.abs(differenceWithDesiredElementsNumber));
        } else {

        }

        if (this.state !== treeWatcherStates.stopped) {
            this.watcherTimeout = setTimeout(this.tick.bind(this), config.treeWatcher.interval);
        } else {
            this.stoppingCallback();
        }
        this.isTickProcessing = false;
    }

    async createDesiredInitialTreeElements(number) {
        for (let i = 0; i < number; i++) {
            const lessLoadedWithoutStream = await this.getLessLoadedWithoutStream();
            if (!lessLoadedWithoutStream) {
                return;
            }

            await this.createNewTreeElementWithStream(lessLoadedWithoutStream);
        }
    }

    async createNewTreeElementWithStream(lessLoadedWithoutStream) {
        const {treeStore, treeElementStore} = this.storeCollection;
        logger.info(`Creating tree element for call id ${this.tree.callId}`);
        const treeElement = await treeElementStore.create({
            kms: lessLoadedWithoutStream,
            callId: this.tree.callId,
            state: 'initial'
        });
        this.tree = await treeStore.addTreeElement(this.tree, treeElement);
        const parentElementId = await this.tree.getParentElementId(treeElement);
        const parentElement = await treeElementStore.findReadyById(parentElementId);

        await this.connectTreeElementsWithPlumber(parentElement, treeElement);

        await treeElementStore.setState(treeElement, 'ready');
    }

    async connectTreeElementsWithPlumber(parentElement, childElement) {
        const {treeElementStore, plumberStore} = this.storeCollection;

        const {element: sourceWebrtc, mongoElement: mongoSourceWebrtc} = await this.createSourceWebrtc(parentElement);
        const {element: targetWebrtc, mongoElement: mongoTargetWebrtc} = await this.createTargetWebrtc(childElement);

        await this.connectWebrtc(sourceWebrtc, targetWebrtc);

        const connectingPlumber = await plumberStore.create({
            callId: parentElement.callId,
            sourceWebrtc: mongoSourceWebrtc,
            targetWebrtc: mongoTargetWebrtc
        });

        await treeElementStore.addOutgoingPlumber(parentElement, connectingPlumber);
        await treeElementStore.setIncomingPlumber(childElement, connectingPlumber);
    }

    async connectWebrtc(sourceWebrtc, targetWebrtc) {
        sourceWebrtc.on('OnIceCandidate', event => {
            const kurentoCandidate = kurento.register.complexTypes.IceCandidate(event.candidate);
            targetWebrtc.addIceCandidate(kurentoCandidate);
        });
        targetWebrtc.on('OnIceCandidate', event => {
            const kurentoCandidate = kurento.register.complexTypes.IceCandidate(event.candidate);
            sourceWebrtc.addIceCandidate(kurentoCandidate);
        });

        const offer = await sourceWebrtc.generateOffer();

        await targetWebrtc.processOffer(offer);
        await targetWebrtc.gatherCandidates();
        const answer = await targetWebrtc.getLocalSessionDescriptor();

        await sourceWebrtc.gatherCandidates();
        await sourceWebrtc.processAnswer(answer);
    }

    async createSourceWebrtc(treeElement) {
        const {kmsStore, plumberStore, webrtcStore} = this.storeCollection;
        const kms = await kmsStore.findById(treeElement.kms);

        const sourcePlumber = await plumberStore.findById(treeElement.incomingPlumber);
        const {kmsClient, pipeline} = await this.getTreeElementKmsAndPipeline(treeElement);

        const plumberTargetWebrtc = await webrtcStore.findById(sourcePlumber.targetWebrtc);
        const {element: webrtc} = await kmsClient.retrive(plumberTargetWebrtc.elementId);

        const {element: sourceElement} = await kmsClient.createElement('WebRtcEndpoint', pipeline);
        const sourceWebrtc = await webrtcStore.create({
            elementId: sourceElement.id,
            callId: this.tree.callId,
            streamType: 'restreaming'
        });
        await kmsStore.addWebrtc(kms, sourceWebrtc);

        webrtc.connect(sourceElement);

        return {element: sourceElement, mongoElement: sourceWebrtc};
    }

    async createTargetWebrtc(treeElement) {
        const {kmsStore, webrtcStore} = this.storeCollection;
        const kms = await kmsStore.findById(treeElement.kms);

        const {kmsClient, pipeline} = await this.getTreeElementKmsAndPipeline(treeElement);
        const {element} = await kmsClient.createElement('WebRtcEndpoint', pipeline);
        const webrtc = await webrtcStore.create({
            elementId: element.id,
            callId: this.tree.callId,
            streamType: 'publish'
        });
        await kmsStore.addWebrtc(kms, webrtc);
        return {element, mongoElement: webrtc};
    }

    async getTreeElementKmsAndPipeline(treeElement) {
        const {kmsStore} = this.storeCollection;
        const kms = await kmsStore.findById(treeElement.kms);
        const kmsClient = await this.kurentoClientCollection.getOrCreateClientWithConnection(kms.url);
        const {element: pipeline} = await kmsClient.retrive(kms.pipeline.elementId);
        return {kmsClient, pipeline};
    }

    async getLessLoadedWithoutStream() {
        const {kmsStore, treeElementStore} = this.storeCollection;
        const treeElements = await treeElementStore.findByCallId(this.tree.callId);
        const elementsKmsIds = treeElements.reduce((acc, cur) => [...acc, cur.kms], []);
        return await kmsStore.getLessLoadedExceptList(elementsKmsIds);
    }
}

module.exports = TreeWatcher;