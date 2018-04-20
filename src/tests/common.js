const puppeteer = require('puppeteer');
const path = require('path');

async function openTestPage() {
    const browser = await puppeteer.launch({
        args: ['--use-fake-ui-for-media-stream']
    });
    const page = await browser.newPage();
    await page.goto(`file:${path.join(__dirname, 'testpage.html')}`);
    await page.evaluate(async () => {
        await connect();
        await clearServer();
    });
    return {browser, page};
}

async function registerDefaultKms(page) {
    return await page.evaluate(async () => {
        return await registerKms([
            'ws://localhost:8889/kurento',
            'ws://localhost:8887/kurento',
            'ws://localhost:8890/kurento'
        ]);
    });
}

async function publishStream(page) {
    return await page.evaluate(async () => {
        return await publish();
    });
}

async function viewStream(page, callId) {
    return await page.evaluate(async (callId) => {
        return await view(callId);
    }, callId);
}

module.exports = {
    registerDefaultKms,
    openTestPage,
    publishStream,
    viewStream
};