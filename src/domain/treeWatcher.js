const kurento = require('kurento-client');
const KurentoElement = require('./kurentoElement');
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
        return new Promise(resolve => {
            clearTimeout(this.watcherTimeout);
            this.stoppingCallback = resolve;
            this.state = treeWatcherStates.stopped;
            if (!this.isTickProcessing) {
                this.stoppingCallback();
            }
        });
    }

    async tick() {
        try {
            this.isTickProcessing = true;
            const {treeStore} = this.storeCollection;
            const tree = await treeStore.findById(this.tree._id);
            if (!tree) {
                return;
            }

            const differenceWithDesiredElementsNumber = tree.elements.length - config.treeWatcher.desiredTreeElementsCount;
            if (differenceWithDesiredElementsNumber < 0) {
                await this.createDesiredInitialTreeElements(Math.abs(differenceWithDesiredElementsNumber));
            } else {
                const needToCreateNewTreeElement = await this.needToCreateNewTreeElement();
                const needToRemoveEmptyElements = await this.needToRemoveEmptyElements();

                if (needToCreateNewTreeElement) {
                    await this.createNewTreeElement();
                } else if (needToRemoveEmptyElements) {
                    await this.removeEmptyElement();
                }
            }
        } catch (err) {
            console.log(err);
        }

        if (this.state !== treeWatcherStates.stopped) {
            this.watcherTimeout = setTimeout(this.tick.bind(this), config.treeWatcher.interval);
        } else {
            this.stoppingCallback();
        }
        this.isTickProcessing = false;
    }

    async needToCreateNewTreeElement() {
        const {kmsStore} = this.storeCollection;
        const kmsIds = await this.getUsedKmsIds();
        const averageLoad = await kmsStore.getAverageLoadFromList(kmsIds);
        return averageLoad > config.treeWatcher.desiredNumberOfElementsPerKms;
    }

    async needToRemoveEmptyElements() {
        const {treeElementStore} = this.storeCollection;
        const emptyElement = await treeElementStore.countEmptyElementByCallId(this.tree.callId);
        const treeElements = await treeElementStore.findByCallId(this.tree.callId);

        return emptyElement > 1 && treeElements.length > config.treeWatcher.desiredTreeElementsCount;
    }

    async removeEmptyElement() {
        const {treeElementStore} = this.storeCollection;
        const emptyElement = await treeElementStore.findEmptyElementByCallId(this.tree.callId);

        await this.removeTreeElement(emptyElement);
    }

    async removeTreeElement(element) {
        const {treeStore, plumberStore, treeElementStore} = this.storeCollection;
        const incomingPlumber = await plumberStore.findById(element.incomingPlumber);
        const elementWebrtcIds = [...element.webrtc, incomingPlumber.sourceWebrtc, incomingPlumber.targetWebrtc];
        for (let i = 0; i < elementWebrtcIds.length; i++) {
            const currentElement = this.createKurentoElement({});
            await currentElement.initWithModelId(elementWebrtcIds[i]);
            await currentElement.remove();
        }

        const parentElementId = await this.tree.getParentElementId(element);
        const parentElement = await treeElementStore.findReadyById(parentElementId);
        await treeElementStore.removeOutgoingPlumber(parentElement, incomingPlumber);

        this.tree = await treeStore.removeTreeElement(this.tree, element);
        await plumberStore.removeById(incomingPlumber._id);
        await treeElementStore.removeById(element._id);
    }

    async createDesiredInitialTreeElements(number) {
        for (let i = 0; i < number; i++) {
            await this.createNewTreeElement();
        }
    }

    async createNewTreeElement() {
        const lessLoadedWithoutStream = await this.getLessLoadedWithoutStream();
        if (!lessLoadedWithoutStream) {
            return;
        }

        await this.createNewTreeElementWithStream(lessLoadedWithoutStream);
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
        const {kmsStore} = this.storeCollection;
        const usedKmsIds = await this.getUsedKmsIds();
        return await kmsStore.getLessLoadedExceptList(usedKmsIds);
    }

    async getUsedKmsIds() {
        const {treeElementStore} = this.storeCollection;
        const treeElements = await treeElementStore.findByCallId(this.tree.callId);
        return treeElements.reduce((acc, cur) => [...acc, cur.kms], []);
    }

    createKurentoElement(args = {}) {
        return new KurentoElement({
            ...args,
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
    }
}

module.exports = TreeWatcher;