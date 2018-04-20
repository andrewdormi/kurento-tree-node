const {registerDefaultKms, openTestPage, publishStream} = require('./common');

const mock = {};
describe('media:publish', () => {
    beforeEach(async (done) => {
        const {browser, page} = await openTestPage();
        mock.browser = browser;
        mock.page = page;

        await registerDefaultKms(mock.page);
        done()
    });

    afterEach(async (done) => {
        // await mock.browser.close();
        done();
    });

    it('Can publish stream', async (done) => {
        await publishStream(mock.page);
        done();
    });
});