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
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });
        // await stealth_mode.hideWebDriver({page: page});
        // await stealth_mode.hackPermissions({page: page});
        await stealth_mode.addLanguage({page: page});
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
        await page.setDefaultTimeout(120000);

        return await page.goto(request.url);

    }


    async handlePage({request, page, puppeteerPool}) {
        console.log(`Processing ${request.url}`);
        // A function to be evaluated by Puppeteer within the browser context.
        await Apify.utils.sleep(2000);
        await page.waitForSelector('div.section-result');
        // await page._client.send("Page.stopLoading");

        let contents = await page.content();
        const $ = cheerio.load(contents);
        let title = $('title').text();
        let data = await parser.CrawlPlace({request, page, puppeteerPool});

        //goto next page
        // await page.click('button[jsaction="pane.paginationSection.nextPage"]');
        console.log('Crawling compelte for this search term');
        // await puppeteerPool.retire(page.browser);

        console.log(`Title: ${title}`);


    }

    async handleFailedRequest() {
        console.log(`Request ${request.url} failed too many times`);
    }
}


Apify.main(async () => {

    // delete the old apify_storage files
    await utils.deleteFolderRecursive('apify_storage');
    const requestQueue = await Apify.openRequestQueue('mapsScraper');
    const searchTerms = fs.readFileSync('input.csv').toString().split('\n');
    for (let i = 0; i < searchTerms.length; i += 1) {
        const searchTerm = searchTerms[i];
        await requestQueue.addRequest({
            url: `https://www.google.com/maps/search/${searchTerm}/?hl=en`,
            userData: {searchTerm: searchTerm}
        });
    }


    //override settings here

    options.requestQueue = requestQueue;
    options.maxRequestRetries = 30;

    options.minConcurrency = 1;
    options.maxConcurrency = 1;
    options.handlePageTimeoutSecs = 9999;
    options.puppeteerPoolOptions.stealth = false;

    options.puppeteerPoolOptions.retireInstanceAfterRequestCount = 1;
    options.launchPuppeteerOptions.headless = false;
    crawler = new Crawler(options);

    // Run the crawler and wait for it to finish.
    console.log('begin');
    await crawler.run();
    console.log('Crawler finished.');
});






