const {PuppeteerCrawler} = require('apify');

const Apify = require('apify');
const cheerio = require('cheerio');
const options = require('./libs/settings');


const utils = require('./libs/utils');
var crawler;
const stealth_mode = require('./libs/stealth');

const fs = require('fs');


Apify.main(async () => {
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


    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        minConcurrency: 3,
        maxConcurrency: 7,
        maxRequestRetries: 30,
        handlePageTimeoutSecs: 300,


        // Here you can set options that are passed to the Apify.launchPuppeteer() function.
        puppeteerPoolOptions: {
            retireInstanceAfterRequestCount: 10, // Will use one proxy for 3 pages.
        },

        launchPuppeteerOptions: {
            stealth: false,
            headless: false,

        },
        gotoFunction: async ({request, page}) => {
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });
            });
            await stealth_mode.hideWebDriver({page: page});
            await stealth_mode.hackPermissions({page: page});
            await stealth_mode.addLanguage({page: page});
            // await stealth_mode.emulateWebGL({page: page});
            // await stealth_mode.emulateWindowFrame({page: page});
            // await stealth_mode.addPlugins({page: page});
            // await stealth_mode.mockChrome({page: page});
            // await stealth_mode.emulateConsoleDebug({page: page});
            // await stealth_mode.mockChromeInIframe({page: page});
            // await stealth_mode.mockDeviceMemory({page: page});
            await stealth_mode.emulateTimeZone({page: page});
            await stealth_mode.emulateConnection({page: page});


            return await page.goto(request.url);

        },

        handlePageFunction: async ({request, page,puppeteerPool}) => {
            console.log(`Processing ${request.url}`);
            // A function to be evaluated by Puppeteer within the browser context.
            // await Apify.utils.sleep(2000);
            await page.waitForSelector('title');
            // await page._client.send("Page.stopLoading");

            let contents = await page.content();
            const $ = cheerio.load(contents)
            let title = $('title').text();
            console.log(`Title: ${title}`);
            await puppeteerPool.retire(page.browser);


        },


        // This function is called if the page processing failed more than maxRequestRetries+1 times.
        handleFailedRequestFunction: async ({request}) => {
            console.log(`Request ${request.url} failed too many times`);

        },
    });

    // Run the crawler and wait for it to finish.
    await crawler.run();

    console.log('Crawler finished.');
});

