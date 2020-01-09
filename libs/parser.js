// for instagram set referrer
//
// for facebook also set referrer.
//
// for google also set referrer. do it in the goto file. or here in parser.js
const cheerio = require('cheerio');
const Apify = require('apify');


async function CrawlPlace({request, page, puppeteerPool}) {
    let contents = await page.content();
    const $ = cheerio.load(contents);
    let title = $('title').text();
    console.log('Getting places detail for', title);
    // TODO: click on each result section one by one and click back button. page.evaluate not working for some reason
    // use this to click and capture google data by on response https://github.com/puppeteer/puppeteer/issues/3713
    const handler = await page.$$('div.section-result');
    let total = handler.length;
    console.log(total, 'results found');
    let i = 1;
    for (let i = 0; i < total; i += 1) {
        await page.waitForSelector('div.section-result');
        const handles = await page.$$('div.section-result');
        await Apify.utils.sleep(1000);
        console.log('inside the results section');
        await handles[i].click();

        await page.waitForSelector('[data-section-id="ad"] .widget-pane-link');

        page = await parseIndividualLocation({page, i});
        page = await getBackToResults({page});
    }

    //going to next page
    console.log('Place details complete');


}

async function parseIndividualLocation({page, i}) {
    // add wait for page to laod herel
    let contents = await page.content();
    const $ = cheerio.load(contents);
    // parse detail here
    /*
    Google place_id
     */


    let name = $('h1').text();
    let address = $('[data-section-id="ad"] .widget-pane-link').text().trim();
    let category = $('[jsaction="pane.rating.category"]').text().trim();
    let phone = $('[data-section-id="pn0"].section-info-speak-numeral').length
        ? $('[data-section-id="pn0"].section-info-speak-numeral').attr('data-href').replace('tel:', '')
        : null;
    let website = $('[data-section-id="ap"]').length ? $('[data-section-id="ap"]').eq('0').text().trim() : '';
    let rating = $('span.section-star-display').eq(0).text().trim();
    let reviews = $('button[jsaction="pane.rating.moreReviews"]').text().replace(')', '').replace('(', '') || '';
    let url = page.url();
    let lat = url.split('@')[1].split(',')[0];
    let lon = url.split('@')[1].split(',')[1];
    let price_level = $('span[aria-label="Price: Inexpensive"]').length || '';
    let emails = Apify.utils.social.emailsFromText(contents);
    let results = {
        'name': name,
        'address': address,
        'category': category,
        'phone': phone,
        'email': '',
        'website_url': website,
        'facebook_url': '',
        'facebook_url_profile_image': '',
        'facebook_url_cover_image': '',
        'rating': rating,
        'lat': lat,
        'lng': lon,
        'reviews': reviews,
        'ig_user': '',
        'ig_user_image_url': '',
        'ig_location': '',
        'id': '',
        'google_place_id': '',
        'price_level': price_level,

    };
    const puppeteerPool = new Apify.PuppeteerPool({
        launchPuppeteerOptions: {
            stealth: true,
            headless: true
        }
    });
    const page1 = await puppeteerPool.newPage();
    await page1.setUserAgent('Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0; WOW64; Trident/4.0; SLCC1)');
    let googlePlaceId = await GetPlaceId({page: page1, name: name, address: address});
    let instagramData = await CrawlInstagram({page: page1, name: name});
    // perform facebook search here.
    let facebookData = await CrawlFacebook({page: page1, name: name});
    await puppeteerPool.destroy();
    results['facebook_url_profile_image'] = facebookData['profileUrl'];
    results['facebook_url'] = facebookData['facebookUrl'];
    results['facebook_url_cover_image'] = facebookData['coverUrl'];
    results['ig_user'] = instagramData['username'];
    results['ig_user_image_url'] = instagramData['profilePic'];
    results['ig_location'] = instagramData['placeId'];
    results['id'] = instagramData['userId'];
    results['google_place_id'] = googlePlaceId;

    console.log(results);
    await Apify.pushData(results);
    console.log(`processing  result ${i + 1}`);
    return page

}


async function GetPlaceId({page, name, address}) {
    await page.goto('https://google-developers.appspot.com/maps/documentation/javascript/examples/full/places-placeid-finder');
    await page.waitForSelector('input[id="pac-input"]');
    await Apify.utils.sleep(2000);
    await page.click('input[id="pac-input"]');
    await page.type('input[id="pac-input"]', name);
    let searchTerm = name;
    await Apify.utils.sleep(500);
    await page.click('input[id="pac-input"]');
    await Apify.utils.sleep(500);
    await page.keyboard.press('ArrowDown');
    await Apify.utils.sleep(500);
    await page.keyboard.press('Enter');
    await page.waitForSelector('span#place-id');
    await Apify.utils.sleep(500);

    let contents = await page.content();
    const $ = cheerio.load(contents);

    let place_id = $('span#place-id').text() || '';
    console.log('getting placeid', place_id);
    return place_id;
}

async function getBackToResults({page}) {

    // click backtoresults button
    let backButton = await page.$x('//*[contains(text(),"Back to results")]');
    if (backButton.length > 0) {
        await backButton[0].click();
    } else {
        console.error('Backbutton not detected');
    }
    console.log('Going back to main result');
    return page
}


async function CrawlInstagram({page, name}) {
    console.log('searching on instagram');
    let url = `https://www.instagram.com/web/search/topsearch/?context=blended&query=${name}`;
    await page.goto(url);
    let contents = await page.content();
    const $ = cheerio.load(contents);

    let data = JSON.parse($.text());
    let placeId = '';
    let username = '';
    let userId = '';
    let profilePic = '';
    // place id
    try {
        placeId = data['places'][0]['place']['location']['pk'] || '';
    } catch (e) {
        console.log('place id not found', e);
        placeId = '';
    }

    //username
    try {
        username = data['users'][0]['user']['username'] || '';
    } catch (e) {
        console.log('userId not found', e);
        username = '';
    }

    //userId
    try {
        userId = data['users'][0]['user']['pk'] || '';
    } catch (e) {
        console.log('userid not found', e);
        userId = '';
    }

    //profile pic
    try {
        profilePic = data['users'][0]['user']['profile_pic_url'] || '';
    } catch (e) {
        console.log('userid not found', e);
        profilePic = '';
    }
    console.log('instagram search done');

    return {placeId, username, userId, profilePic}

}


async function CrawlFacebook({page, name, location}) {
    console.log('searching on Facebook');
    let searchTerm = `facebook ${name}`;
    let facebookUrl = await GoogleSearch({page, searchTerm});
    await page.goto(facebookUrl);
    let contents = await page.content();
    const $ = cheerio.load(contents);
    let profileUrl = '';
    let coverUrl = '';
    try {
        profileUrl = $('a[aria-label="Profile picture"] img').attr('src') || '';
    } catch (e) {
        console.log('Cannot find facebook url', e);

    }

    try {
        coverUrl = $('div[id="PagesCoverElementContainerPagelet"] img').attr('src') || '';
    } catch (e) {
        console.log('Cannot find facebook url', e);

    }
    return {facebookUrl, profileUrl, coverUrl}

    console.log('Facebook search finished');
}

async function GoogleSearch({page, searchTerm}) {
    // console.log('Searching on google. iI will return the first url');
    await page.goto(`https://www.google.com/search?q=${searchTerm}`);
    let contents = await page.content();
    const $ = cheerio.load(contents);
    let url = $('body > div:nth-child(3) > div:nth-child(1) > div > div > div > div:nth-child(1) > a').attr('href') || '';
    return url

}


module.exports = {
    CrawlPlace: CrawlPlace,
    CrawlInstagram: CrawlInstagram,
    CrawlFacebook: CrawlFacebook,


};
