const {registerDefaultKms, openTestPage} = require('./common');

const mock = {};
describe('kms:register', () => {
    beforeEach(async (done) => {
        const {browser, page} = await openTestPage();
        mock.browser = browser;
        mock.page = page;
        done()
    });

    afterEach(async (done) => {
        await mock.browser.close();
        done();
    });

    it('Register kms', async (done) => {
        await registerDefaultKms(mock.page);
        done();
    });

    it('Will not register kms with same link', async (done) => {
        const check = async () => {
            await page.evaluate(async () => {
                await registerKms([
                    'ws://localhost:8890/kurento',
                    'ws://localhost:8890/kurento'
                ]);
            });
        };
        await expect(check()).rejects.toThrow();
        done();
    });
});