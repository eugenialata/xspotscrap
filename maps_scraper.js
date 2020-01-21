const {PuppeteerCrawler} = require('apify');

const Apify = require('apify');
const cheerio = require('cheerio');
const options = require('./libs/settings');
const parser = require('./libs/parser');


const utils = require('./libs/utils');
var crawler;
const stealth_mode = require('./libs/stealth');

const fs = require('fs');

class Crawler extends PuppeteerCrawler {
    constructor(options) {

        super(options);

        this.handlePageFunction = this.handlePage;
        this.handleFailedRequestFunction = this.handleFailedRequest;
        this.gotoFunction = this.goto;

    }


    async goto({request, page}) {
        // await page.evaluateOnNewDocument(() => {
        //     Object.defineProperty(navigator, 'webdriver', {
        //         get: () => false,
        //     });
        // });
        // await stealth_mode.hideWebDriver({page: page});
        // await stealth_mode.hackPermissions({page: page});
        // await stealth_mode.addLanguage({page: page});
        // await stealth_mode.emulateWebGL({page: page});
        // await stealth_mode.emulateWindowFrame({page: page});
        // await stealth_mode.addPlugins({page: page});
        // await stealth_mode.mockChrome({page: page});
        // await stealth_mode.emulateConsoleDebug({page: page});
        // await stealth_mode.mockChromeInIframe({page: page});
        // await stealth_mode.mockDeviceMemory({page: page});
        // await stealth_mode.emulateTimeZone({page: page});
        // await stealth_mode.emulateConnection({page: page});

        // await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36');
        // await page.setDefaultTimeout(120000);
        await page.goto(request.url);
        return await page.goto(request.url);

    }

    async getHrefs(page, selector) {
        return await page.$$eval(selector, anchors => [].map.call(anchors, a => a.href));
    }

    async handlePage({request, page, puppeteerPool}) {
        console.log(`Processing ${request.url}`);
        await Apify.utils.sleep(2000);


        try {
            await page.waitForSelector('div.section-result', {timeout: 10000});
        } catch (e) {
            throw 'page not loaded'
        }
        let contents = await page.content();
        const $ = cheerio.load(contents);
        let title = $('title').text();

        let data = await parser.CrawlPlace({request: request, page: page, puppeteerPool: puppeteerPool});
        // if next button is available go to next page
        //goto next page
        let looper = true;
        while (looper) {
            try {
                await page.waitForSelector('button[jsaction="pane.paginationSection.nextPage"]', {timeout: 10000});
                await page.click('button[jsaction="pane.paginationSection.nextPage"]');
                await Apify.utils.sleep(2000);
                await page.waitForSelector('div.section-result');
                await parser.CrawlPlace({request, page, puppeteerPool});

            } catch (error) {
                console.log(error);
                console.log("Next complete");
                looper = false;
            }
        }

        console.log('Crawling compelte for this', request.userData.searchTerm);


    }


    async handleFailedRequest() {
        console.log(`Request ${request.url} failed too many times`);
    }
}


Apify.main(async () => {

    // delete the old apify_storage files
    await utils.deleteFolderRecursive('apify_storage');
    const requestQueue = await Apify.openRequestQueue('mapsScraper');
    const searchTerms = fs.readFileSync('input.csv').toString().trim().split('\n');
    for (let i = 0; i < searchTerms.length; i += 1) {

        let searchTerm = searchTerms[i];
        searchTerm = searchTerm.split(' ').join('+');
        await requestQueue.addRequest({
            url: `https://www.google.com/maps/search/${searchTerm}?hl=en`,
            userData: {searchTerm: searchTerm, type: 'search'}
        });
    }


    //override settings here

    options.requestQueue = requestQueue;
    options.maxRequestRetries = 30;

    options.minConcurrency = 5;
    options.maxConcurrency = 5;
    options.handlePageTimeoutSecs = 9999;

    options.puppeteerPoolOptions.retireInstanceAfterRequestCount = 5;
    options.launchPuppeteerOptions.headless = false;
    // options.puppeteerPoolOptions.useIncognitoPages = true;
    options.launchPuppeteerOptions.useChrome = true;

    crawler = new Crawler(options);

    // Run the crawler and wait for it to finish.
    console.log('begin');
    await crawler.run();
    console.log('Crawler finished.');
});






