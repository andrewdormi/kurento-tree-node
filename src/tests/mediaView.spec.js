const {registerDefaultKms, openTestPage, publishStream, viewStream, promiseTimeout, removeElement} = require('./common');
const connect = require('../db/mongo');
const TreeElementsModel = require('../models/treeElement');

const mock = {};
describe('media:view', () => {
    beforeAll(async (done) => {
        await connect();
        done();
    });

    beforeEach(async (done) => {
        const {browser, page} = await openTestPage();
        mock.browser = browser;
        mock.page = page;

        await registerDefaultKms(mock.page);
        done()
    });

    afterEach(async (done) => {
        await mock.browser.close();
        done();
    });

    it('Can view published stream', async (done) => {
        const {callId} = await publishStream(mock.page);
        await viewStream(mock.page, callId);
        done();
    });

    it('Will throw without callId', async (done) => {
        const check = async () => {
            await page.evaluate(async () => {
                await viewStream(mock.page);
            });
        };
        await expect(check()).rejects.toThrow();
        done();
    });

    it('Will throw for not existing callId', async (done) => {
        const check = async () => {
            await page.evaluate(async () => {
                await viewStream(mock.page, 'qweqwe');
            });
        };
        await expect(check()).rejects.toThrow();
        done();
    });

    it('Will create new tree element after desired number of viewers', async (done) => {
        const {callId} = await publishStream(mock.page);
        await viewStream(mock.page, callId);
        await viewStream(mock.page, callId);
        await viewStream(mock.page, callId);
        await viewStream(mock.page, callId);
        await viewStream(mock.page, callId);
        await viewStream(mock.page, callId);
        await promiseTimeout(2000);
        const treeElementsCount = await TreeElementsModel.count({callId});
        expect(treeElementsCount).toBe(3);
        done();
    });

    it('Will remove unused tree elements after stop viewing', async (done) => {
        const {callId} = await publishStream(mock.page);
        const {elementId: elementId1} = await viewStream(mock.page, callId);
        const {elementId: elementId2} = await viewStream(mock.page, callId);
        const {elementId: elementId3} = await viewStream(mock.page, callId);
        const {elementId: elementId4} = await viewStream(mock.page, callId);
        const {elementId: elementId5} = await viewStream(mock.page, callId);
        const {elementId: elementId6} = await viewStream(mock.page, callId);
        await promiseTimeout(2000);
        await removeElement(mock.page, elementId1);
        await removeElement(mock.page, elementId2);
        await removeElement(mock.page, elementId3);
        await removeElement(mock.page, elementId4);
        await removeElement(mock.page, elementId5);
        await removeElement(mock.page, elementId6);
        await promiseTimeout(2000);
        const treeElementsCount = await TreeElementsModel.count({callId});
        expect(treeElementsCount).toBe(2);
        done();
    });
});