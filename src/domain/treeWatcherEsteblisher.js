const EventEmitter = require('events');
const exitHook = require('async-exit-hook');
const TreeWatcher = require('./treeWatcher');

const WATCHER_TIMEOUT = 2000;
const treeWatcherStates = {working: 'working', stopped: 'stopped'};


class TreeWatcherEstablisher extends EventEmitter {
    constructor(storeCollection, kurentoClientCollection) {
        super();
        this.treeWatchers = {};
        this.storeCollection = storeCollection;
        this.kurentoClientCollection = kurentoClientCollection;
        this.listenServerShutdown();
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
        const {treeStore, treeWatchersStore} = this.storeCollection;
        const notWorking = await treeWatchersStore.findOneNotWorking();
        if (notWorking) {
            const tree = await treeStore.findReadyByCallId(notWorking.callId);
            if (tree) {
                await this.registerTreeWatcher(tree, notWorking.callId);
            }
        }

        if (this.state !== treeWatcherStates.stopped) {
            this.watcherTimeout = setTimeout(this.tick.bind(this), WATCHER_TIMEOUT);
        }
    }

    async registerTreeWatcher(tree, callId) {
        const {treeWatchersStore} = this.storeCollection;
        const treeWatcher = new TreeWatcher({
            tree,
            storeCollection: this.storeCollection,
            kurentoClientCollection: this.kurentoClientCollection
        });
        await treeWatcher.start();
        this.treeWatchers[callId] = treeWatcher;

        await treeWatchersStore.createOrSetWorkingForCallId(callId);
    }

    hasWatcherWithCallId(callId) {
        return !!this.treeWatchers[callId];
    }

    async stopWatcherForCallId(callId) {
        await this.treeWatchers[callId].stop();
        delete this.treeWatchers[callId];
    }

    async removeWatcher(callId){
        const {treeWatchersStore} = this.storeCollection;
        await treeWatchersStore.removeWatcherByCallId(callId);
    }

    async clearTreeWatchers() {
        const {treeWatchersStore} = this.storeCollection;

        const callIds = Object.keys(this.treeWatchers);
        for (let i = 0; i < callIds.length; i++) {
            await this.stopWatcherForCallId(callIds[i]);
        }

        await treeWatchersStore.clear();
    }

    listenServerShutdown() {
        exitHook(async callback => {
            const {treeWatchersStore} = this.storeCollection;
            const callIds = Object.keys(this.treeWatchers);

            for (let i = 0; i < callIds.length; i++) {
                await this.stopWatcherForCallId(callIds[i]);
            }
            await treeWatchersStore.markStoppedByCallIds(callIds);

            callback();
        });
    }
}

module.exports = TreeWatcherEstablisher;