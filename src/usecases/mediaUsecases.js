const uuidv4 = require('uuid/v4');
const kurento = require('kurento-client');
const KurentoElement = require('../domain/kurentoElement');
const TreeWatcher = require('../domain/treeWatcher');

class MediaUsecases {
    constructor(storeCollection, kurentoClientCollection, amqpController) {
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
        this.amqpController = amqpController;
        this.treeWatchers = {};

        this.amqpController.on('media:remove', this.removePublishEndpoint.bind(this));
    }

    async publish(offer, onIceCandidate) {
        const {kmsStore, treeStore, plumberStore, treeElementStore} = this.storeCollection;

        const callId = uuidv4();
        const kms = await kmsStore.getLessLoadKms();

        const publishElement = this.createKurentoElement({
            kms,
            callId,
            streamType: 'publish',
            elementType: 'WebRtcEndpoint'
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
        const tree = await treeStore.findReadyByCallId(callId);
        if (!tree) {
            throw {message: 'Cant find chat with call id', code: 404};
        }

        const kms = await this.getLessLoadKmsFromTree(tree);

        const treeElement = await treeElementStore.findByCallIdAndKms(callId, kms);
        const incomingPlumber = await plumberStore.findById(treeElement.incomingPlumber);

        const publishElement = this.createKurentoElement({kms});
        await publishElement.initWithModelId(incomingPlumber.targetWebrtc);

        const viewElement = this.createKurentoElement({kms, callId, streamType: 'view', elementType: 'WebRtcEndpoint'});
        await viewElement.save();

        this.handleIceCandidates(viewElement.element, callId, onIceCandidate);
        const answer = await viewElement.element.processOffer(offer);
        await viewElement.element.gatherCandidates();
        await publishElement.element.connect(viewElement.element);

        await treeElementStore.addWebrtc(treeElement, viewElement.model);
        return {callId, answer, elementId: viewElement.element.id};
    }

    async remove(elementId) {
        const {treeStore, treeElementStore} = this.storeCollection;

        const removingElement = this.createKurentoElement();
        await removingElement.initWithElementId(elementId);
        if (!removingElement.element) {
            throw {message: 'Cant find removing element', code: 404};
        }

        const tree = await treeStore.findReadyByCallId(removingElement.callId);
        if (!tree) {
            throw {message: 'Cant find chat with call id', code: 404};
        }

        if (removingElement.streamType === 'view') {
            const treeElement = await treeElementStore.findWithWebrtc(removingElement.model);
            if (!treeElement) {
                throw {message: 'Cant find removing element in tree', code: 404};
            }

            await treeElementStore.removeWebrtc(treeElement, removingElement.model._id);
            await removingElement.remove();
        } else {
            this.amqpController.publish({
                type: 'media:remove',
                data: {elementId, callId: tree.callId}
            });
        }
    }

    async removePublishEndpoint({elementId, callId}) {
        const {treeStore, webrtcStore, treeElementStore, plumberStore} = this.storeCollection;
        if (!this.treeWatchers[callId]) {
            return;
        }

        const tree = await treeStore.findReadyTreeByCallIdAndLockForDeleting(callId);
        await this.treeWatchers[callId].stop();
        delete this.treeWatchers[callId];

        const allWebrtcForCallId = await webrtcStore.findByCallId(callId);
        for (let i = 0; i < allWebrtcForCallId.length; i++) {
            const webrtcElement = this.createKurentoElement();
            await webrtcElement.initWithModelId(allWebrtcForCallId[i]._id);

            await webrtcElement.remove();
        }

        await treeStore.removeByCallId(callId);
        await treeElementStore.removeByCallId(callId);
        await plumberStore.removeByCallId(callId);
        await webrtcStore.removeByCallId(callId);
    }

    async addCandidate(elementId, candidate) {
        const webrtc = this.createKurentoElement();
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

    createKurentoElement(args = {}) {
        return new KurentoElement({
            ...args,
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
    }
}

module.exports = MediaUsecases;