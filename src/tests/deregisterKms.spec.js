const {registerDefaultKms, openTestPage} = require('./common');

const mock = {};
describe('kms:deregister', () => {
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

    it('Deregister kms', async (done) => {
        await registerDefaultKms(mock.page);
        await mock.page.evaluate(async () => {
            await deregisterKms([
                'ws://localhost:8890/kurento',
                'ws://localhost:8890/kurento'
            ]);
        });
        done();
    });

    it('Will not register kms with same link', async (done) => {
        await registerDefaultKms(mock.page);
        const check = async () => {
            await mock.page.evaluate(async () => {
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