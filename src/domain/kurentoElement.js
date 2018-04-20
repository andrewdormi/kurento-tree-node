class KurentoElement {
    constructor({kms, elementType, streamType, callId, kurentoClientCollection, storeCollection}) {
        this.kms = kms;
        this.elementType = elementType;
        this.streamType = streamType;
        this.callId = callId;
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
        this.element = null;
        this.model = null;
    }

    async save() {
        if (this.elementType === 'MediaPipeline') {
            return await this.savePipeline();
        }
        if (this.elementType === 'WebRtcEndpoint') {
            return await this.createWebrtc();
        }
    }

    async savePipeline() {
        const {kmsStore, pipelineStore} = this.storeCollection;

        const client = await this.kurentoClientCollection.getOrCreateClientWithConnection(this.kms.url);
        const {element: pipeline} = await client.createElement(this.elementType);
        const pipelineModel = await pipelineStore.create({elementId: pipeline.id});

        this.element = pipeline;
        this.model = pipelineModel;

        await kmsStore.setPipeline(this.kms, pipelineModel);
    }

    async createWebrtc() {
        const {kmsStore, webrtcStore} = this.storeCollection;
        const client = await this.kurentoClientCollection.getOrCreateClientWithConnection(this.kms.url);

        const {element: pipeline} = await client.retrive(this.kms.pipeline.elementId);
        const {element: webrtc} = await client.createElement(this.elementType, pipeline);

        const webrtcModel = await webrtcStore.create({
            elementId: webrtc.id,
            callId: this.callId,
            streamType: this.streamType
        });

        this.element = webrtc;
        this.model = webrtcModel;

        await kmsStore.addWebrtc(this.kms, webrtcModel);
    }

    async initWithModelId(id) {
        const {kmsStore, webrtcStore} = this.storeCollection;

        const webrtcModel = await webrtcStore.findById(id);
        if (!this.kms) {
            this.kms = await kmsStore.findWebrtcKms(webrtcModel);
        }
        const client = await this.kurentoClientCollection.getOrCreateClientWithConnection(this.kms.url);
        const {element: webrtc} = await client.retrive(webrtcModel.elementId);

        this.element = webrtc;
        this.model = webrtcModel;
        this.streamType = webrtcModel.streamType;
        this.elementType = 'WebRtcEndpoint';
        this.callId = webrtcModel.callId;
    }

    async initWithElementId(id) {
        const {kmsStore, webrtcStore} = this.storeCollection;
        const webrtcModel = await webrtcStore.findByElementId(id);
        if (!webrtcModel) {
            return;
        }
        if (!this.kms) {
            this.kms = await kmsStore.findWebrtcKms(webrtcModel);
        }
        const client = await this.kurentoClientCollection.getOrCreateClientWithConnection(this.kms.url);
        const {element: webrtc} = await client.retrive(webrtcModel.elementId);

        this.element = webrtc;
        this.model = webrtcModel;
        this.streamType = webrtcModel.streamType;
        this.elementType = 'WebRtcEndpoint';
        this.callId = webrtcModel.callId;
    }

    async remove() {
        const {kmsStore} = this.storeCollection;

        await kmsStore.removeWebrtc(this.kms, this.model._id);
        await this.model.remove();
        await this.element.release();
    }
}

module.exports = KurentoElement;