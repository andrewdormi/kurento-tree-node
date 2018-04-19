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
        await this.tick();
    }

    async stop() {
        clearTimeout(this.watcherTimeout);
        this.state = treeWatcherStates.stopped;
    }

    async tick() {
        const tree = await this.treeStore.findById(this.tree._id);

        const differenceWithDesiredElementsNumber = tree.elements.length - config.treeWatcher.desiredInitialTreeElements;
        if (differenceWithDesiredElementsNumber < 0) {
            await this.createDesiredInitialTreeElements(Math.abs(differenceWithDesiredElementsNumber));
        } else {

        }

        if (this.state !== treeWatcherStates.stopped) {
            this.watcherTimeout = setTimeout(this.tick.bind(this), config.treeWatcher.interval);
        }
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
        logger.info(`Creating tree element for call id ${this.tree.callId}`);
        const treeElement = await this.treeElementStore.create({
            kms: lessLoadedWithoutStream,
            callId: this.tree.callId,
            state: 'initial'
        });
        this.tree = await this.treeStore.addTreeElement(this.tree, treeElement);
        const parentElementId = await this.tree.getParentElementId(treeElement);
        const parentElement = await this.treeElementStore.findReadyById(parentElementId);

        await this.connectTreeElementsWithPlumber(parentElement, treeElement);

        await this.treeElementStore.setState(treeElement, 'ready');
    }

    async connectTreeElementsWithPlumber(parentElement, childElement) {
        const {element: sourceWebrtc, mongoElement: mongoSourceWebrtc} = await this.createSourceWebrtc(parentElement);
        const {element: targetWebrtc, mongoElement: mongoTargetWebrtc} = await this.createTargetWebrtc(childElement);

        await this.connectWebrtc(sourceWebrtc, targetWebrtc);

        const connectingPlumber = await this.plumberStore.create({
            callId: parentElement.callId,
            sourceWebrtc: mongoSourceWebrtc,
            targetWebrtc: mongoTargetWebrtc
        });

        await this.treeElementStore.addOutgoingPlumber(parentElement, connectingPlumber);
        await this.treeElementStore.setIncomingPlumber(childElement, connectingPlumber);
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
        const kms = await this.kmsStore.findById(treeElement.kms);

        const sourcePlumber = await this.plumberStore.findById(treeElement.incomingPlumber);
        const {kmsClient, pipeline} = await this.getTreeElementKmsAndPipeline(treeElement);

        const plumberTargetWebrtc = await this.webrtcStore.findById(sourcePlumber.targetWebrtc);
        const webrtcWrapped = await kmsClient.retrive(plumberTargetWebrtc.elementId);
        const webrtc = webrtcWrapped.get();

        const {element: sourceElement} = await kmsClient.createElement('WebRtcEndpoint', pipeline);
        const sourceWebrtc = await this.webrtcStore.create({
            elementId: sourceElement.id,
            callId: this.tree.callId,
            streamType: 'restreaming'
        });
        await this.kmsStore.addWebrtc(kms, sourceWebrtc);

        webrtc.connect(sourceElement);

        return {element: sourceElement, mongoElement: sourceWebrtc};
    }

    async createTargetWebrtc(treeElement) {
        const kms = await this.kmsStore.findById(treeElement.kms);

        const {kmsClient, pipeline} = await this.getTreeElementKmsAndPipeline(treeElement);
        const {element} = await kmsClient.createElement('WebRtcEndpoint', pipeline);
        const webrtc = await this.webrtcStore.create({
            elementId: element.id,
            callId: this.tree.callId,
            streamType: 'publish'
        });
        await this.kmsStore.addWebrtc(kms, webrtc);
        return {element, mongoElement: webrtc}
    }

    async getTreeElementKmsAndPipeline(treeElement) {
        const kms = await this.kmsStore.findById(treeElement.kms);
        const kmsClient = await this.kurentoClientCollection.getOrCreateClientWithConnection(kms.url);
        const pipelineWrapped = await kmsClient.retrive(kms.pipeline.elementId);
        return {kmsClient, pipeline: pipelineWrapped.get()};
    }

    async getLessLoadedWithoutStream() {
        const treeElements = await this.treeElementStore.findByCallId(this.tree.callId);
        const elementsKmsIds = treeElements.reduce((acc, cur) => [...acc, cur.kms], []);
        return await this.kmsStore.getLessLoadedExceptList(elementsKmsIds);
    }
}

module.exports = TreeWatcher;