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

    it('Can remove publish endpoint', async (done) => {
        const {callId, elementId} = await publishStream(mock.page);
        await viewStream(mock.page, callId);
        await removeElement(mock.page, elementId);
        done();
    });

    it('Will throw without elementId', async (done) => {
        const check = async () => {
            await page.evaluate(async () => {
                await removeElement(mock.page);
            });
        };
        await expect(check()).rejects.toThrow();
        done();
    });

    it('Will throw for not existing elementId', async (done) => {
        const check = async () => {
            await page.evaluate(async () => {
                await removeElement(mock.page, 'qweqwe');
            });
        };
        await expect(check()).rejects.toThrow();
        done();
    });
});