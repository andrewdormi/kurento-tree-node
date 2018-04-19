const uuidv4 = require('uuid/v4');
const kurento = require('kurento-client');
const KurentoElement = require('../domain/kurentoElement');
const TreeWatcher = require('../domain/treeWatcher');

class MediaUsecases {
    constructor(storeCollection, kurentoClientCollection) {
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
        this.treeWatchers = {};
    }

    async publish(offer, onIceCandidate) {
        const {kmsStore, treeStore, plumberStore, treeElementStore} = this.storeCollection;

        const callId = uuidv4();
        const kms = await kmsStore.getLessLoadKms();

        const publishElement = new KurentoElement({
            kms,
            callId,
            streamType: 'publish',
            elementType: 'WebRtcEndpoint',
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
        await publishElement.save();

        this.handleIceCandidates(publishElement.element, callId, onIceCandidate);
        const answer = await publishElement.element.processOffer(offer);
        await publishElement.element.gatherCandidates();

        const plumber = await plumberStore.create({callId, targetWebrtc: publishElement.model});
        const treeElement = await treeElementStore.create({kms, callId, incomingPlumber: plumber});

        const tree = await treeStore.create({elements: [treeElement], callId});

        await this.registerTreeWatcher(tree, callId);

        return {callId, answer, elementId: publishElement.element.id};
    }

    async registerTreeWatcher(tree, callId) {
        const treeWatcher = new TreeWatcher({
            tree,
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
        await treeWatcher.start();
        this.treeWatchers[callId] = treeWatcher;
    }

    async view(offer, callId, onIceCandidate) {
        const {treeStore, treeElementStore, plumberStore} = this.storeCollection;
        const tree = await treeStore.findByCallId(callId);
        if (!tree) {
            throw {message: 'Cant find chat with call id', code: 404};
        }

        const kms = await this.getLessLoadKmsFromTree(tree);


        const treeElement = await treeElementStore.findByCallIdAndKms(callId, kms);
        const incomingPlumber = await plumberStore.findById(treeElement.incomingPlumber);

        const publishElement = new KurentoElement({kms});
        await publishElement.initWithModelId(incomingPlumber.targetWebrtc);

        const viewElement = new KurentoElement({
            kms,
            callId,
            streamType: 'view',
            elementType: 'WebRtcEndpoint',
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
        await viewElement.save();

        this.handleIceCandidates(viewElement.element, callId, onIceCandidate);
        const answer = await viewElement.element.processOffer(offer);
        await viewElement.element.gatherCandidates();
        await publishElement.element.connect(viewElement.element);

        await treeElementStore.addWebrtc(treeElement, viewElement.model);
        return {callId, answer, elementId: viewElement.element.id};
    }

    async addCandidate(elementId, candidate) {
        const webrtc = new KurentoElement();
        await webrtc.initWithElementId(elementId);

        if (!webrtc.element) {
            throw {message: 'Cant find webrtc endpoint', code: 404};
        }

        const kurentoCandidate = kurento.register.complexTypes.IceCandidate(candidate);
        await webrtc.element.addIceCandidate(kurentoCandidate);
    }

    handleIceCandidates(endpoint, callId, onIceCandidate) {
        endpoint.on('OnIceCandidate', event => {
            const candidate = kurento.getComplexType('IceCandidate')(event.candidate);
            onIceCandidate({
                candidate: {
                    candidate: candidate.candidate,
                    sdpMid: candidate.sdpMid,
                    sdpMLineIndex: candidate.sdpMLineIndex
                },
                elementId: endpoint.id,
                callId
            });
        });
    }

    async getLessLoadKmsFromTree(tree) {
        const {treeElementStore, kmsStore} = this.storeCollection;
        const treeElements = await treeElementStore.findReadyByIds(tree.elements);
        const elementsKmsIds = treeElements.reduce((acc, cur) => [...acc, cur.kms], []);
        return await kmsStore.getLessLoadedFromList(elementsKmsIds);
    }
}

module.exports = MediaUsecases;