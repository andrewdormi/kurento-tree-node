const amqp = require('amqplib');
const {EventEmitter} = require('events');

class AmqpController extends EventEmitter {
    constructor() {
        super();
        this.queue = 'tree';
    }

    async connect() {
        this.publishConnection = await amqp.connect(config.rabbitMQUrl);
        this.publishCahnnel = await this.publishConnection.createChannel();
        this.publishCahnnel.assertExchange(this.queue, 'fanout', {durable: false});

        this.consumerConnection = await amqp.connect(config.rabbitMQUrl);
        this.consumerCahnnel = await this.consumerConnection.createChannel();
        const q = await this.consumerCahnnel.assertQueue('', {exclusive: true});
        await this.consumerCahnnel.bindQueue(q.queue, this.queue, '');
        this.consumerCahnnel.consume(q.queue, msg => {
            const data = JSON.parse(msg.content.toString());
            this.emit(data.type, data.data);
        });

        logger.info('Connected to rabbitMQ');
    }

    async publish(msg) {
        await this.publishCahnnel.publish(this.queue, '', new Buffer(JSON.stringify(msg)));
    }
}

module.exports = AmqpController;