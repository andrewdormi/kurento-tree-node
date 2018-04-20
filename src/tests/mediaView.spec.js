const {registerDefaultKms, openTestPage, publishStream, viewStream} = require('./common');

const mock = {};
describe('media:view', () => {
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
        const callId = await publishStream(mock.page);
        await viewStream(mock.page, callId);
        done();
    });
});