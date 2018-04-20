const {registerDefaultKms, openTestPage, publishStream, viewStream, removeElement} = require('./common');

const mock = {};
describe('media:remove', () => {
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

    it('Can remove view element', async (done) => {
        const {callId} = await publishStream(mock.page);
        const {elementId} = await viewStream(mock.page, callId);
        await removeElement(mock.page, elementId);
        done();
    });
});