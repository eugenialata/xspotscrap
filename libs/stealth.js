async function hideWebDriver({page}) {
    console.log('Hiding webdriver')
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });


}


async function hackPermissions({page}) {

    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query; // eslint-disable-next-line

        window.navigator.permissions.__proto__.query = parameters => parameters.name === 'notifications' ? Promise.resolve({
                state: Notification.permission
            }) //eslint-disable-line
            : originalQuery(parameters); // Inspired by: https://github.com/ikarienator/phantomjs_hide_and_seek/blob/master/5.spoofFunctionBind.js


        const oldCall = Function.prototype.call;

        function call() {
            return oldCall.apply(this, arguments); //eslint-disable-line
        } // eslint-disable-next-line


        Function.prototype.call = call;
        const nativeToStringFunctionString = Error.toString().replace(/Error/g, 'toString');
        const oldToString = Function.prototype.toString;

        function functionToString() {
            if (this === window.navigator.permissions.query) {
                return 'function query() { [native code] }';
            }

            if (this === functionToString) {
                return nativeToStringFunctionString;
            }

            return oldCall.call(oldToString, this);
        } // eslint-disable-next-line


        functionToString();

    });
}

async function addLanguage({page}) {

    await page.evaluateOnNewDocument(() => {

        Object.defineProperty(window.navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
    });
}


async function emulateWebGL({page}) {
    await page.evaluateOnNewDocument(() => {

        try {
            const getParameterOld = WebGLRenderingContext.getParameter;

            WebGLRenderingContext.prototype.getParameter = function (parameter) {
                // UNMASKED_VENDOR_WEBGL
                if (parameter === 37445) {
                    return 'Intel Inc.';
                } // UNMASKED_RENDERER_WEBGL


                if (parameter === 37446) {
                    return 'Intel(R) Iris(TM) Plus Graphics 640';
                }

                return getParameterOld(parameter);
            };
        } catch (err) {
            console.error('hiding_tricks: Could not emulate WebGL');
        }
    })
}


async function emulateWindowFrame({page}) {
    await page.evaluateOnNewDocument(() => {

        try {
            if (window.outerWidth && window.outerHeight) {
                return; // nothing to do here
            }

            const windowFrame = 85; // probably OS and WM dependent

            window.outerWidth = window.innerWidth;
            window.outerHeight = window.innerHeight + windowFrame;
        } catch (err) {
            console.error('hiding_tricks: Could not emulate window frame');
        }
    });
}


async function addPlugins({page}) {
    await page.evaluateOnNewDocument(() => {

        function mockPluginsAndMimeTypes() {
            // Disguise custom functions as being native
            const makeFnsNative = (fns = []) => {
                const oldCall = Function.prototype.call;

                function call() {
                    return oldCall.apply(this, arguments); // eslint-disable-line
                } // eslint-disable-next-line


                Function.prototype.call = call;
                const nativeToStringFunctionString = Error.toString().replace(/Error/g, 'toString');
                const oldToString = Function.prototype.toString;

                function functionToString() {
                    for (const fn of fns) {
                        if (this === fn.ref) {
                            return `function ${fn.name}() { [native code] }`;
                        }
                    }

                    if (this === functionToString) {
                        return nativeToStringFunctionString;
                    }

                    return oldCall.call(oldToString, this);
                } // eslint-disable-next-line


                Function.prototype.toString = functionToString;
            };

            const mockedFns = [];
            const fakeData = {
                mimeTypes: [{
                    type: 'application/pdf',
                    suffixes: 'pdf',
                    description: '',
                    __pluginName: 'Chrome PDF Viewer'
                }, {
                    type: 'application/x-google-chrome-pdf',
                    suffixes: 'pdf',
                    description: 'Portable Document Format',
                    __pluginName: 'Chrome PDF Plugin'
                }, {
                    type: 'application/x-nacl',
                    suffixes: '',
                    description: 'Native Client Executable',
                    enabledPlugin: window.Plugin,
                    __pluginName: 'Native Client'
                }],
                plugins: [{
                    name: 'Chrome PDF Plugin',
                    filename: 'internal-pdf-viewer',
                    description: 'Portable Document Format'
                }, {
                    name: 'Chrome PDF Viewer',
                    filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                    description: ''
                }, {
                    name: 'Native Client',
                    filename: 'internal-nacl-plugin',
                    description: ''
                }
                ],
                fns: {
                    namedItem: instanceName => {
                        // Returns the Plugin/MimeType with the specified name.
                        const fn = function (name) {
                            if (!arguments.length) {
                                throw new TypeError(`Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`);
                            }

                            return this[name] || null;
                        };

                        mockedFns.push({
                            ref: fn,
                            name: 'namedItem'
                        });
                        return fn;
                    },
                    item: instanceName => {
                        // Returns the Plugin/MimeType at the specified index into the array.
                        const fn = function (index) {
                            if (!arguments.length) {
                                throw new TypeError(`Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`);
                            }

                            return this[index] || null;
                        };

                        mockedFns.push({
                            ref: fn,
                            name: 'item'
                        });
                        return fn;
                    },
                    refresh: () => {
                        // Refreshes all plugins on the current page, optionally reloading documents.
                        const fn = function () {
                            return undefined;
                        };

                        mockedFns.push({
                            ref: fn,
                            name: 'refresh'
                        });
                        return fn;
                    }
                }
            }; // Poor mans _.pluck

            const getSubset = (keys, obj) => keys.reduce((a, c) => ({
                ...a,
                [c]: obj[c]
            }), {});

            function generateMimeTypeArray() {
                const arr = fakeData.mimeTypes.map(obj => getSubset(['type', 'suffixes', 'description'], obj)).map(obj => Object.setPrototypeOf(obj, MimeType.prototype));
                arr.forEach(obj => {
                    arr[obj.type] = obj;
                }); // Mock functions

                arr.namedItem = fakeData.fns.namedItem('MimeTypeArray');
                arr.item = fakeData.fns.item('MimeTypeArray');
                return Object.setPrototypeOf(arr, MimeTypeArray.prototype);
            }

            const mimeTypeArray = generateMimeTypeArray();
            console.log(mimeTypeArray);
            Object.defineProperty(window.navigator, 'mimeTypes', {
                get: () => mimeTypeArray
            });

            function generatePluginArray() {
                const arr = fakeData.plugins.map(obj => getSubset(['name', 'filename', 'description'], obj)).map(obj => {
                    const mimes = fakeData.mimeTypes.filter(m => m.__pluginName === obj.name // eslint-disable-line
                    ); // Add mimetypes

                    mimes.forEach((mime, index) => {
                        window.navigator.mimeTypes[mime.type].enabledPlugin = obj;
                        obj[mime.type] = window.navigator.mimeTypes[mime.type];
                        obj[index] = window.navigator.mimeTypes[mime.type];
                    });
                    obj.length = mimes.length;
                    return obj;
                }).map(obj => {
                    // Mock functions
                    obj.namedItem = fakeData.fns.namedItem('Plugin');
                    obj.item = fakeData.fns.item('Plugin');
                    return obj;
                }).map(obj => Object.setPrototypeOf(obj, window.Plugin.prototype));
                arr.forEach(obj => {
                    arr[obj.name] = obj;
                }); // Mock functions

                arr.namedItem = fakeData.fns.namedItem('PluginArray');
                arr.item = fakeData.fns.item('PluginArray');
                arr.refresh = fakeData.fns.refresh('PluginArray');
                return Object.setPrototypeOf(arr, PluginArray.prototype);
            }

            const pluginArray = generatePluginArray();
            Object.defineProperty(window.navigator, 'plugins', {
                get: () => pluginArray
            }); // Make mockedFns toString() representation resemble a native function

            makeFnsNative(mockedFns);
        }

        const isPluginArray = window.navigator.plugins instanceof PluginArray;
        const hasPlugins = isPluginArray && window.navigator.plugins.length > 0;

        if (isPluginArray && hasPlugins) {
            return; // nothing to do here
        }

        mockPluginsAndMimeTypes();
    });
}


async function emulateConsoleDebug({page}) {
    await page.evaluateOnNewDocument(() => {

        window.console.debug = () => {
            return null;
        };
    }); // Should be mocked more properly - this one will bypass only some stupid tests
}

async function mockChrome({page}) {
    await page.evaluateOnNewDocument(() => {

        Object.defineProperty(window, 'chrome', {
            value: {
                runtime: {}
            }
        });
    });
}// not sure if this hack does not broke iframe on websites... Should figure out how to test properly
// Should cover that it is custom function same as the permission query


async function mockChromeInIframe({page}) {
    await page.evaluateOnNewDocument(() => {

        const oldCreate = document.createElement.bind(document);

        const newCreate = (...args) => {
            if (args[0] === 'iframe') {
                const iframe = oldCreate(...args);

                if (!iframe.contentWindow) {
                    Object.defineProperty(iframe, 'contentWindow', {
                        configurable: true,
                        value: {
                            chrome: {}
                        }
                    });
                }

                if (!iframe.contentWindow.chrome) {
                    Object.defineProperty(iframe.contentWindow, 'chrome', {
                        value: {},
                        configurable: true
                    });
                }

                return iframe;
            }

            return oldCreate(...args);
        };

        newCreate.toString = () => 'function createElement() { [native code] }';

        document.createElement = newCreate;
        const oldCall = Function.prototype.call;

        function call() {
            return oldCall.apply(this, arguments); //eslint-disable-line
        } // eslint-disable-next-line


        Function.prototype.call = call;
        const nativeToStringFunctionString = Error.toString().replace(/Error/g, 'toString');
        const oldToString = Function.prototype.toString;

        function functionToString() {
            if (this === window.document.createElement) {
                return 'function createElement() { [native code] }';
            }

            if (this === functionToString) {
                return nativeToStringFunctionString;
            }

            return oldCall.call(oldToString, this);
        } // eslint-disable-next-line


        functionToString();
    });
}


async function mockDeviceMemory({page}) {
    await page.evaluateOnNewDocument(() => {

        // TODO: Count from env according to - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
        Object.defineProperty(navigator, 'deviceMemory', {
            value: 8
        });
    });
}

async function emulateTimeZone({page, timezoneString = 'America/New_York'}) {
    // get timezonestring here https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    await page.emulateTimezone(timezoneString)
}

/*
 TODO Not working find solution
*/
async function emulateKeyBoard({page}) {
    await page.evaluateOnNewDocument(() => {
        navigator.keyboard.getLayoutMap = function () {
            return {size: 48}

        }

    });

}

async function emulateConnection({page}) {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperties(navigator.connection, {
            downlink: {value: Math.floor(Math.random() * (10 - 1) + 1)},
            effectiveType: {value: "4g"},
            onchange: {value: null},
            rtt: {value: Math.floor(Math.random() * (100 - 1) + 1)},
            saveData: {value: false},
        });
    });


}

async function emulateFonts({page}) {
    //['.Aqua Kana', '.Helvetica LT MM', '.Times LT MM', '18thCentury', '8514oem', 'AR BERKLEY', 'AR JULIAN', 'AR PL UKai CN', 'AR PL UMing CN', 'AR PL UMing HK', 'AR PL UMing TW', 'AR PL UMing TW MBE', 'Aakar', 'Abadi MT Condensed Extra Bold', 'Abadi MT Condensed Light', 'Abyssinica SIL', 'AcmeFont', 'Adobe Arabic', 'Agency FB', 'Aharoni', 'Aharoni Bold', 'Al Bayan', 'Al Bayan Bold', 'Al Bayan Plain', 'Al Nile', 'Al Tarikh', 'Aldhabi', 'Alfredo', 'Algerian', 'Alien Encounters', 'Almonte Snow', 'American Typewriter', 'American Typewriter Bold', 'American Typewriter Condensed', 'American Typewriter Light', 'Amethyst', 'Andale Mono', 'Andale Mono Version', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Ani', 'AnjaliOldLipi', 'Aparajita', 'Apple Braille', 'Apple Braille Outline 6 Dot', 'Apple Braille Outline 8 Dot', 'Apple Braille Pinpoint 6 Dot', 'Apple Braille Pinpoint 8 Dot', 'Apple Chancery', 'Apple Color Emoji', 'Apple LiGothic Medium', 'Apple LiSung Light', 'Apple SD Gothic Neo', 'Apple SD Gothic Neo Regular', 'Apple SD GothicNeo ExtraBold', 'Apple Symbols', 'AppleGothic', 'AppleGothic Regular', 'AppleMyungjo', 'AppleMyungjo Regular', 'AquaKana', 'Arabic Transparent', 'Arabic Typesetting', 'Arial', 'Arial Baltic', 'Arial Black', 'Arial Bold', 'Arial Bold Italic', 'Arial CE', 'Arial CYR', 'Arial Greek', 'Arial Hebrew', 'Arial Hebrew Bold', 'Arial Italic', 'Arial Narrow', 'Arial Narrow Bold', 'Arial Narrow Bold Italic', 'Arial Narrow Italic', 'Arial Rounded Bold', 'Arial Rounded MT Bold', 'Arial TUR', 'Arial Unicode MS', 'ArialHB', 'Arimo', 'Asimov', 'Autumn', 'Avenir', 'Avenir Black', 'Avenir Book', 'Avenir Next', 'Avenir Next Bold', 'Avenir Next Condensed', 'Avenir Next Condensed Bold', 'Avenir Next Demi Bold', 'Avenir Next Heavy', 'Avenir Next Regular', 'Avenir Roman', 'Ayuthaya', 'BN Jinx', 'BN Machine', 'BOUTON International Symbols', 'Baby Kruffy', 'Baghdad', 'Bahnschrift', 'Balthazar', 'Bangla MN', 'Bangla MN Bold', 'Bangla Sangam MN', 'Bangla Sangam MN Bold', 'Baskerville', 'Baskerville Bold', 'Baskerville Bold Italic', 'Baskerville Old Face', 'Baskerville SemiBold', 'Baskerville SemiBold Italic', 'Bastion', 'Batang', 'BatangChe', 'Bauhaus 93', 'Beirut', 'Bell MT', 'Bell MT Bold', 'Bell MT Italic', 'Bellerose', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BiauKai', 'Big Caslon', 'Big Caslon Medium', 'Birch Std', 'Bitstream Charter', 'Bitstream Vera Sans', 'Blackadder ITC', 'Blackoak Std', 'Bobcat', 'Bodoni 72', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Poster Compressed', 'Bodoni Ornaments', 'BolsterBold', 'Book Antiqua', 'Book Antiqua Bold', 'Bookman Old Style', 'Bookman Old Style Bold', 'Bookshelf Symbol 7', 'Borealis', 'Bradley Hand', 'Bradley Hand ITC', 'Braggadocio', 'Brandish', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script', 'Brush Script MT', 'Brush Script MT Italic', 'Brush Script Std', 'Brussels', 'Calibri', 'Calibri Bold', 'Calibri Light', 'Californian FB', 'Calisto MT', 'Calisto MT Bold', 'Calligraphic', 'Calvin', 'Cambria', 'Cambria Bold', 'Cambria Math', 'Candara', 'Candara Bold', 'Candles', 'Carrois Gothic SC', 'Castellar', 'Centaur', 'Century', 'Century Gothic', 'Century Gothic Bold', 'Century Schoolbook', 'Century Schoolbook Bold', 'Century Schoolbook L', 'Chalkboard', 'Chalkboard Bold', 'Chalkboard SE', 'Chalkboard SE Bold', 'ChalkboardBold', 'Chalkduster', 'Chandas', 'Chaparral Pro', 'Chaparral Pro Light', 'Charlemagne Std', 'Charter', 'Chilanka', 'Chiller', 'Chinyen', 'Clarendon', 'Cochin', 'Cochin Bold', 'Colbert', 'Colonna MT', 'Comic Sans MS', 'Comic Sans MS Bold', 'Commons', 'Consolas', 'Consolas Bold', 'Constantia', 'Constantia Bold', 'Coolsville', 'Cooper Black', 'Cooper Std Black', 'Copperplate', 'Copperplate Bold', 'Copperplate Gothic Bold', 'Copperplate Light', 'Corbel', 'Corbel Bold', 'Cordia New', 'CordiaUPC', 'Corporate', 'Corsiva', 'Corsiva Hebrew', 'Corsiva Hebrew Bold', 'Courier', 'Courier 10 Pitch', 'Courier Bold', 'Courier New', 'Courier New Baltic', 'Courier New Bold', 'Courier New CE', 'Courier New Italic', 'Courier Oblique', 'Cracked Johnnie', 'Creepygirl', 'Curlz MT', 'Cursor', 'Cutive Mono', 'DFKai-SB', 'DIN Alternate', 'DIN Condensed', 'Damascus', 'Damascus Bold', 'Dancing Script', 'DaunPenh', 'David', 'Dayton', 'DecoType Naskh', 'Deja Vu', 'DejaVu LGC Sans', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Deneane', 'Desdemona', 'Detente', 'Devanagari MT', 'Devanagari MT Bold', 'Devanagari Sangam MN', 'Didot', 'Didot Bold', 'Digifit', 'DilleniaUPC', 'Dingbats', 'Distant Galaxy', 'Diwan Kufi', 'Diwan Kufi Regular', 'Diwan Thuluth', 'Diwan Thuluth Regular', 'DokChampa', 'Dominican', 'Dotum', 'DotumChe', 'Droid Sans', 'Droid Sans Fallback', 'Droid Sans Mono', 'Dyuthi', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'Emmett', 'Engravers MT', 'Engravers MT Bold', 'Enliven', 'Eras Bold ITC', 'Estrangelo Edessa', 'Ethnocentric', 'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'Euphemia UCAS Bold', 'Eurostile', 'Eurostile Bold', 'Expressway Rg', 'FangSong', 'Farah', 'Farisi', 'Felix Titling', 'Fingerpop', 'Fixedsys', 'Flubber', 'Footlight MT Light', 'Forte', 'FrankRuehl', 'Frankfurter Venetian TT', 'Franklin Gothic Book', 'Franklin Gothic Book Italic', 'Franklin Gothic Medium', 'Franklin Gothic Medium Cond', 'Franklin Gothic Medium Italic', 'FreeMono', 'FreeSans', 'FreeSerif', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'Futura', 'Futura Condensed ExtraBold', 'Futura Medium', 'GB18030 Bitmap', 'Gabriola', 'Gadugi', 'Garamond', 'Garamond Bold', 'Gargi', 'Garuda', 'Gautami', 'Gazzarelli', 'Geeza Pro', 'Geeza Pro Bold', 'Geneva', 'GenevaCY', 'Gentium', 'Gentium Basic', 'Gentium Book Basic', 'GentiumAlt', 'Georgia', 'Georgia Bold', 'Geotype TT', 'Giddyup Std', 'Gigi', 'Gill', 'Gill Sans', 'Gill Sans Bold', 'Gill Sans MT', 'Gill Sans MT Bold', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans MT Italic', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Glockenspiel', 'Gloucester MT Extra Condensed', 'Good Times', 'Goudy', 'Goudy Old Style', 'Goudy Old Style Bold', 'Goudy Stout', 'Greek Diner Inline TT', 'Gubbi', 'Gujarati MT', 'Gujarati MT Bold', 'Gujarati Sangam MN', 'Gujarati Sangam MN Bold', 'Gulim', 'GulimChe', 'GungSeo Regular', 'Gungseouche', 'Gungsuh', 'GungsuhChe', 'Gurmukhi', 'Gurmukhi MN', 'Gurmukhi MN Bold', 'Gurmukhi MT', 'Gurmukhi Sangam MN', 'Gurmukhi Sangam MN Bold', 'Haettenschweiler', 'Hand Me Down S (BRK)', 'Hansen', 'Harlow Solid Italic', 'Harrington', 'Harvest', 'HarvestItal', 'Haxton Logos TT', 'HeadLineA Regular', 'HeadlineA', 'Heavy Heap', 'Hei', 'Hei Regular', 'Heiti SC', 'Heiti SC Light', 'Heiti SC Medium', 'Heiti TC', 'Heiti TC Light', 'Heiti TC Medium', 'Helvetica', 'Helvetica Bold', 'Helvetica CY Bold', 'Helvetica CY Plain', 'Helvetica LT Std', 'Helvetica Light', 'Helvetica Neue', 'Helvetica Neue Bold', 'Helvetica Neue Medium', 'Helvetica Oblique', 'HelveticaCY', 'HelveticaNeueLT Com 107 XBlkCn', 'Herculanum', 'High Tower Text', 'Highboot', 'Hiragino Kaku Gothic Pro W3', 'Hiragino Kaku Gothic Pro W6', 'Hiragino Kaku Gothic ProN W3', 'Hiragino Kaku Gothic ProN W6', 'Hiragino Kaku Gothic Std W8', 'Hiragino Kaku Gothic StdN W8', 'Hiragino Maru Gothic Pro W4', 'Hiragino Maru Gothic ProN W4', 'Hiragino Mincho Pro W3', 'Hiragino Mincho Pro W6', 'Hiragino Mincho ProN W3', 'Hiragino Mincho ProN W6', 'Hiragino Sans GB W3', 'Hiragino Sans GB W6', 'Hiragino Sans W0', 'Hiragino Sans W1', 'Hiragino Sans W2', 'Hiragino Sans W3', 'Hiragino Sans W4', 'Hiragino Sans W5', 'Hiragino Sans W6', 'Hiragino Sans W7', 'Hiragino Sans W8', 'Hiragino Sans W9', 'Hobo Std', 'Hoefler Text', 'Hoefler Text Black', 'Hoefler Text Ornaments', 'Hollywood Hills', 'Hombre', 'Huxley Titling', 'ITC Stone Serif', 'ITF Devanagari', 'ITF Devanagari Marathi', 'ITF Devanagari Medium', 'Impact', 'Imprint MT Shadow', 'InaiMathi', 'Induction', 'Informal Roman', 'Ink Free', 'IrisUPC', 'Iskoola Pota', 'Italianate', 'Jamrul', 'JasmineUPC', 'Javanese Text', 'Jokerman', 'Juice ITC', 'KacstArt', 'KacstBook', 'KacstDecorative', 'KacstDigital', 'KacstFarsi', 'KacstLetter', 'KacstNaskh', 'KacstOffice', 'KacstOne', 'KacstPen', 'KacstPoster', 'KacstQurn', 'KacstScreen', 'KacstTitle', 'KacstTitleL', 'Kai', 'Kai Regular', 'KaiTi', 'Kailasa', 'Kailasa Regular', 'Kaiti SC', 'Kaiti SC Black', 'Kalapi', 'Kalimati', 'Kalinga', 'Kannada MN', 'Kannada MN Bold', 'Kannada Sangam MN', 'Kannada Sangam MN Bold', 'Kartika', 'Karumbi', 'Kedage', 'Kefa', 'Kefa Bold', 'Keraleeyam', 'Keyboard', 'Khmer MN', 'Khmer MN Bold', 'Khmer OS', 'Khmer OS System', 'Khmer Sangam MN', 'Khmer UI', 'Kinnari', 'Kino MT', 'KodchiangUPC', 'Kohinoor Bangla', 'Kohinoor Devanagari', 'Kohinoor Telugu', 'Kokila', 'Kokonor', 'Kokonor Regular', 'Kozuka Gothic Pr6N B', 'Kristen ITC', 'Krungthep', 'KufiStandardGK', 'KufiStandardGK Regular', 'Kunstler Script', 'Laksaman', 'Lao MN', 'Lao Sangam MN', 'Lao UI', 'LastResort', 'Latha', 'Leelawadee', 'Letter Gothic Std', 'LetterOMatic!', 'Levenim MT', 'LiHei Pro', 'LiSong Pro', 'Liberation Mono', 'Liberation Sans', 'Liberation Sans Narrow', 'Liberation Serif', 'Likhan', 'LilyUPC', 'Limousine', 'Lithos Pro Regular', 'LittleLordFontleroy', 'Lohit Assamese', 'Lohit Bengali', 'Lohit Devanagari', 'Lohit Gujarati', 'Lohit Gurmukhi', 'Lohit Hindi', 'Lohit Kannada', 'Lohit Malayalam', 'Lohit Odia', 'Lohit Punjabi', 'Lohit Tamil', 'Lohit Tamil Classical', 'Lohit Telugu', 'Loma', 'Lucida Blackletter', 'Lucida Bright', 'Lucida Bright Demibold', 'Lucida Bright Demibold Italic', 'Lucida Bright Italic', 'Lucida Calligraphy', 'Lucida Calligraphy Italic', 'Lucida Console', 'Lucida Fax', 'Lucida Fax Demibold', 'Lucida Fax Regular', 'Lucida Grande', 'Lucida Grande Bold', 'Lucida Handwriting', 'Lucida Handwriting Italic', 'Lucida Sans', 'Lucida Sans Demibold Italic', 'Lucida Sans Typewriter', 'Lucida Sans Typewriter Bold', 'Lucida Sans Unicode', 'Luminari', 'Luxi Mono', 'MS Gothic', 'MS Mincho', 'MS Outlook', 'MS PGothic', 'MS PMincho', 'MS Reference Sans Serif', 'MS Reference Specialty', 'MS Sans Serif', 'MS Serif', 'MS UI Gothic', 'MT Extra', 'MV Boli', 'Mael', 'Magneto', 'Maiandra GD', 'Malayalam MN', 'Malayalam MN Bold', 'Malayalam Sangam MN', 'Malayalam Sangam MN Bold', 'Malgun Gothic', 'Mallige', 'Mangal', 'Manorly', 'Marion', 'Marion Bold', 'Marker Felt', 'Marker Felt Thin', 'Marlett', 'Martina', 'Matura MT Script Capitals', 'Meera', 'Meiryo', 'Meiryo Bold', 'Meiryo UI', 'MelodBold', 'Menlo', 'Menlo Bold', 'Mesquite Std', 'Microsoft', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft JhengHei UI', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft Tai Le Bold', 'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft YaHei UI', 'Microsoft Yi Baiti', 'Minerva', 'MingLiU', 'MingLiU-ExtB', 'MingLiU_HKSCS', 'Minion Pro', 'Miriam', 'Mishafi', 'Mishafi Gold', 'Mistral', 'Modern', 'Modern No. 20', 'Monaco', 'Mongolian Baiti', 'Monospace', 'Monotype Corsiva', 'Monotype Sorts', 'MoolBoran', 'Moonbeam', 'MotoyaLMaru', 'Mshtakan', 'Mshtakan Bold', 'Mukti Narrow', 'Muna', 'Myanmar MN', 'Myanmar MN Bold', 'Myanmar Sangam MN', 'Myanmar Text', 'Mycalc', 'Myriad Arabic', 'Myriad Hebrew', 'Myriad Pro', 'NISC18030', 'NSimSun', 'Nadeem', 'Nadeem Regular', 'Nakula', 'Nanum Barun Gothic', 'Nanum Gothic', 'Nanum Myeongjo', 'NanumBarunGothic', 'NanumGothic', 'NanumGothic Bold', 'NanumGothicCoding', 'NanumMyeongjo', 'NanumMyeongjo Bold', 'Narkisim', 'Nasalization', 'Navilu', 'Neon Lights', 'New Peninim MT', 'New Peninim MT Bold', 'News Gothic MT', 'News Gothic MT Bold', 'Niagara Engraved', 'Niagara Solid', 'Nimbus Mono L', 'Nimbus Roman No9 L', 'Nimbus Sans L', 'Nimbus Sans L Condensed', 'Nina', 'Nirmala UI', 'Nirmala.ttf', 'Norasi', 'Noteworthy', 'Noteworthy Bold', 'Noto Color Emoji', 'Noto Emoji', 'Noto Mono', 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Noto Sans', 'Noto Sans Armenian', 'Noto Sans Bengali', 'Noto Sans CJK', 'Noto Sans Canadian Aboriginal', 'Noto Sans Cherokee', 'Noto Sans Devanagari', 'Noto Sans Ethiopic', 'Noto Sans Georgian', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Sans Hebrew', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans Kannada', 'Noto Sans Khmer', 'Noto Sans Lao', 'Noto Sans Malayalam', 'Noto Sans Myanmar', 'Noto Sans Oriya', 'Noto Sans SC', 'Noto Sans Sinhala', 'Noto Sans Symbols', 'Noto Sans TC', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Thai', 'Noto Sans Yi', 'Noto Serif', 'Notram', 'November', 'Nueva Std', 'Nueva Std Cond', 'Nyala', 'OCR A Extended', 'OCR A Std', 'Old English Text MT', 'OldeEnglish', 'Onyx', 'OpenSymbol', 'OpineHeavy', 'Optima', 'Optima Bold', 'Optima Regular', 'Orator Std', 'Oriya MN', 'Oriya MN Bold', 'Oriya Sangam MN', 'Oriya Sangam MN Bold', 'Osaka', 'Osaka-Mono', 'OsakaMono', 'PCMyungjo Regular', 'PCmyoungjo', 'PMingLiU', 'PMingLiU-ExtB', 'PR Celtic Narrow', 'PT Mono', 'PT Sans', 'PT Sans Bold', 'PT Sans Caption Bold', 'PT Sans Narrow Bold', 'PT Serif', 'Padauk', 'Padauk Book', 'Padmaa', 'Pagul', 'Palace Script MT', 'Palatino', 'Palatino Bold', 'Palatino Linotype', 'Palatino Linotype Bold', 'Papyrus', 'Papyrus Condensed', 'Parchment', 'Parry Hotter', 'PenultimateLight', 'Perpetua', 'Perpetua Bold', 'Perpetua Titling MT', 'Perpetua Titling MT Bold', 'Phetsarath OT', 'Phosphate', 'Phosphate Inline', 'Phosphate Solid', 'PhrasticMedium', 'PilGi Regular', 'Pilgiche', 'PingFang HK', 'PingFang SC', 'PingFang TC', 'Pirate', 'Plantagenet Cherokee', 'Playbill', 'Poor Richard', 'Poplar Std', 'Pothana2000', 'Prestige Elite Std', 'Pristina', 'Purisa', 'QuiverItal', 'Raanana', 'Raanana Bold', 'Raavi', 'Rachana', 'Rage Italic', 'RaghuMalayalam', 'Ravie', 'Rekha', 'Roboto', 'Rockwell', 'Rockwell Bold', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rockwell Italic', 'Rod', 'Roland', 'Rondalo', 'Rosewood Std Regular', 'RowdyHeavy', 'Russel Write TT', 'SF Movie Poster', 'STFangsong', 'STHeiti', 'STIXGeneral', 'STIXGeneral-Bold', 'STIXGeneral-Regular', 'STIXIntegralsD', 'STIXIntegralsD-Bold', 'STIXIntegralsSm', 'STIXIntegralsSm-Bold', 'STIXIntegralsUp', 'STIXIntegralsUp-Bold', 'STIXIntegralsUp-Regular', 'STIXIntegralsUpD', 'STIXIntegralsUpD-Bold', 'STIXIntegralsUpD-Regular', 'STIXIntegralsUpSm', 'STIXIntegralsUpSm-Bold', 'STIXNonUnicode', 'STIXNonUnicode-Bold', 'STIXSizeFiveSym', 'STIXSizeFiveSym-Regular', 'STIXSizeFourSym', 'STIXSizeFourSym-Bold', 'STIXSizeOneSym', 'STIXSizeOneSym-Bold', 'STIXSizeThreeSym', 'STIXSizeThreeSym-Bold', 'STIXSizeTwoSym', 'STIXSizeTwoSym-Bold', 'STIXVariants', 'STIXVariants-Bold', 'STKaiti', 'STSong', 'STXihei', 'SWGamekeys MT', 'Saab', 'Sahadeva', 'Sakkal Majalla', 'Salina', 'Samanata', 'Samyak Devanagari', 'Samyak Gujarati', 'Samyak Malayalam', 'Samyak Tamil', 'Sana', 'Sana Regular', 'Sans', 'Sarai', 'Sathu', 'Savoye LET Plain:1.0', 'Sawasdee', 'Script', 'Script MT Bold', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Pseudo', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Semilight', 'Segoe UI Symbol', 'Serif', 'Shonar Bangla', 'Showcard Gothic', 'Shree Devanagari 714', 'Shruti', 'SignPainter-HouseScript', 'Silom', 'SimHei', 'SimSun', 'SimSun-ExtB', 'Simplified Arabic', 'Simplified Arabic Fixed', 'Sinhala MN', 'Sinhala MN Bold', 'Sinhala Sangam MN', 'Sinhala Sangam MN Bold', 'Sitka', 'Skia', 'Skia Regular', 'Skinny', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Snowdrift', 'Songti SC', 'Songti SC Black', 'Songti TC', 'Source Code Pro', 'Splash', 'Standard Symbols L', 'Stencil', 'Stencil Std', 'Stephen', 'Sukhumvit Set', 'Suruma', 'Sylfaen', 'Symbol', 'Symbole', 'System', 'System Font', 'TAMu_Kadambri', 'TAMu_Kalyani', 'TAMu_Maduram', 'TSCu_Comic', 'TSCu_Paranar', 'TSCu_Times', 'Tahoma', 'Tahoma Negreta', 'TakaoExGothic', 'TakaoExMincho', 'TakaoGothic', 'TakaoMincho', 'TakaoPGothic', 'TakaoPMincho', 'Tamil MN', 'Tamil MN Bold', 'Tamil Sangam MN', 'Tamil Sangam MN Bold', 'Tarzan', 'Tekton Pro', 'Tekton Pro Cond', 'Tekton Pro Ext', 'Telugu MN', 'Telugu MN Bold', 'Telugu Sangam MN', 'Telugu Sangam MN Bold', 'Tempus Sans ITC', 'Terminal', 'Terminator Two', 'Thonburi', 'Thonburi Bold', 'Tibetan Machine Uni', 'Times', 'Times Bold', 'Times New Roman', 'Times New Roman Baltic', 'Times New Roman Bold', 'Times New Roman Italic', 'Times Roman', 'Tlwg Mono', 'Tlwg Typewriter', 'Tlwg Typist', 'Tlwg Typo', 'TlwgMono', 'TlwgTypewriter', 'Toledo', 'Traditional Arabic', 'Trajan Pro', 'Trattatello', 'Trebuchet MS', 'Trebuchet MS Bold', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Bold', 'Tw Cen MT Italic', 'URW Bookman L', 'URW Chancery L', 'URW Gothic L', 'URW Palladio L', 'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Mono', 'Ukai', 'Ume Gothic', 'Ume Mincho', 'Ume P Gothic', 'Ume P Mincho', 'Ume UI Gothic', 'Uming', 'Umpush', 'UnBatang', 'UnDinaru', 'UnDotum', 'UnGraphic', 'UnGungseo', 'UnPilgi', 'Untitled1', 'Urdu Typesetting', 'Uroob', 'Utkal', 'Utopia', 'Utsaah', 'Valken', 'Vani', 'Vemana2000', 'Verdana', 'Verdana Bold', 'Vijaya', 'Viner Hand ITC', 'Vivaldi', 'Vivian', 'Vladimir Script', 'Vrinda', 'Waree', 'Waseem', 'Waverly', 'Webdings', 'WenQuanYi Bitmap Song', 'WenQuanYi Micro Hei', 'WenQuanYi Micro Hei Mono', 'WenQuanYi Zen Hei', 'Whimsy TT', 'Wide Latin', 'Wingdings', 'Wingdings 2', 'Wingdings 3', 'Woodcut', 'X-Files', 'Year supply of fairy cakes', 'Yu Gothic', 'Yu Mincho', 'Yuppy SC', 'Yuppy SC Regular', 'Yuppy TC', 'Yuppy TC Regular', 'Zapf Dingbats', 'Zapfino', 'Zawgyi-One', 'gargi', 'lklug', 'mry_KacstQurn', 'ori1Uni']; //  		var fonts = ["Times", "Times New Roman", "tata", "toto"]
}

async function emulateCanvas({page}) {
    await page.evaluateOnNewDocument(() => {
        const toBlob = HTMLCanvasElement.prototype.toBlob;
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        const getImageData = CanvasRenderingContext2D.prototype.getImageData;
        //
        var noisify = function (canvas, context) {
            const shift = {
                'r': Math.floor(Math.random() * 10) - 5,
                'g': Math.floor(Math.random() * 10) - 5,
                'b': Math.floor(Math.random() * 10) - 5,
                'a': Math.floor(Math.random() * 10) - 5
            };
            //
            const width = canvas.width, height = canvas.height;
            const imageData = getImageData.apply(context, [0, 0, width, height]);
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    const n = ((i * (width * 4)) + (j * 4));
                    imageData.data[n + 0] = imageData.data[n + 0] + shift.r;
                    imageData.data[n + 1] = imageData.data[n + 1] + shift.g;
                    imageData.data[n + 2] = imageData.data[n + 2] + shift.b;
                    imageData.data[n + 3] = imageData.data[n + 3] + shift.a;
                }
            }
            //
            window.top.postMessage("canvas-fingerprint-defender-alert", '*');
            context.putImageData(imageData, 0, 0);
        };
        //
        Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
            "value": function () {
                noisify(this, this.getContext("2d"));
                return toBlob.apply(this, arguments);
            }
        });
        //
        Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
            "value": function () {
                noisify(this, this.getContext("2d"));
                return toDataURL.apply(this, arguments);
            }
        });
        //
        Object.defineProperty(CanvasRenderingContext2D.prototype, "getImageData", {
            "value": function () {
                noisify(this.canvas, this);
                return getImageData.apply(this, arguments);
            }
        });
        //
        document.documentElement.dataset.cbscriptallow = true;


    });
}

module.exports = {
    hideWebDriver: hideWebDriver,
    hackPermissions: hackPermissions,
    addLanguage: addLanguage,
    emulateWebGL: emulateWebGL,
    emulateWindowFrame: emulateWindowFrame,
    addPlugins: addPlugins,
    mockChrome: mockChrome,
    emulateConsoleDebug: emulateConsoleDebug,
    mockChromeInIframe: mockChromeInIframe,
    mockDeviceMemory: mockDeviceMemory,
    emulateTimeZone: emulateTimeZone,
    emulateKeyBoard: emulateKeyBoard,
    emulateConnection: emulateConnection,
    emulateCanvas: emulateCanvas


};
