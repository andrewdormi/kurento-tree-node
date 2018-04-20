const ServerController = require('./serverController');
const KmsController = require('./kmsController');
const MediaController = require('./mediaController');
const AmqpController = require('./amqpController');

const StoreCollection = require('../domain/storeCollection');

const KmsStore = require('../stores/kmsStore');
const PipelineStore = require('../stores/pipelineStore');
const WebrtcStore = require('../stores/webrtcStore');
const TreeStore = require('../stores/treeStore');
const TreeElementStore = require('../stores/treeElementStore');
const PlumberStore = require('../stores/plumberStore');

const ServerUsecases = require('../usecases/serverUsecases');
const KurentoUsecases = require('../usecases/kurentoUsecases');
const MediaUsecases = require('../usecases/mediaUsecases');

const KurentoClientCollection = require('../domain/kurentoClientCollection');

class IOController {
    constructor(socketServer) {
        const amqpController = new AmqpController();
        amqpController.connect();

        const kurentoClientCollection = new KurentoClientCollection();

        const storeCollection = new StoreCollection({
            kmsStore: new KmsStore(),
            pipelineStore: new PipelineStore(),
            plumberStore: new PlumberStore(),
            webrtcStore: new WebrtcStore(),
            treeStore: new TreeStore(),
            treeElementStore: new TreeElementStore()
        });

        const serverUsecases = new ServerUsecases(storeCollection);
        const kurentoUsecases = new KurentoUsecases(storeCollection, kurentoClientCollection);
        const mediaUsecases = new MediaUsecases(storeCollection, kurentoClientCollection, amqpController);

        const serverController = new ServerController({serverUsecases});
        const kmsController = new KmsController({kurentoUsecases});
        const mediaController = new MediaController({mediaUsecases});

        socketServer.on('connection', socket => {
            this.attachSocketLogger(socket);
            serverController.addSocket(socket);
            kmsController.addRoutes(socket);
            mediaController.addRoutes(socket);
        });
    }

    attachSocketLogger(socket) {
        const onevent = socket.onevent;
        socket.onevent = function (packet) {
            const args = packet.data || [];
            onevent.call(this, packet);    // original call
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      // additional call to catch-all
        };

        socket.on('*', function (event, data) {
            logger.info(`[${event}] ${JSON.stringify(data)}`);
        });

    }
}

module.exports = IOController;