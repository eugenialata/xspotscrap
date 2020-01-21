const options = {
    launchPuppeteerOptions: {
        headless: true,
        stealth: true
    },
    maxRequestRetries: 10,

    puppeteerPoolOptions: {
        // proxyUrls: [],
        // retireInstanceAfterRequestCount: 10, // Will use one proxy for 10 pages.
    },
    handlePageFunction: () => {
    },
    handleFailedRequestFunction: () => {
    },


};

module.exports = options;
