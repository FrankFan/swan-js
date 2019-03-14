describe('', function() {
    const root = 'pages/app-page/';
    const {dispatchEvent} = window.testutils.clientActions;
    function createSwanPage(uri = `${root}page1`) {
        return new Promise(resolve => {
            window.define(uri, () => {
                Page({});
            });
            window.__swanRoute = uri;
            require(uri);
            dispatchEvent('AppReady', {
                root: '',
                appPath: 'http://localhost:9876/base/test/util',
                pageUrl: uri,
                wvID: '333',
                appConfig: `{
                    "pages": [
                       "${root}page1",
                       "${root}page2"
                   ],
                    "subPackages": [{
                        "root": "pages/preload/",
                        "pages": [
                            "reload"
                        ]
                    }],
                    "tabBar": {
                       "list": [
                            {
                              "iconPath": "images/component_normal.png",
                              "selectedIconPath": "images/component_selected.png",
                              "pagePath": "${root}page1",
                              "text": "标签1"
                            },
                            {
                              "iconPath": "images/API_normal.png",
                              "selectedIconPath": "images/API_selected.png",
                              "pagePath": "${root}page2",
                              "text": "标签2"
                            }
                        ]
                    },
                    "preloadRule": {
                        "one": {
                            "packages": ["pages/preload/"],
                            "network": "all"
                        }
                    }
                }`
            });
            setTimeout(resolve, 5);
        });
    }
    beforeEach(() => {
        const {historyStack} = window.masterManager.navigator.history;
        if (historyStack && historyStack.length !== 0) {
            historyStack.forEach(item => item.close());
            window.masterManager.navigator.history.historyStack = [];
        }
    });
    describe('preLoadSubPackage test', () => {
        it('preload parameters are correct & networkType is wifi', function (done) {
            window.swan.getNetworkType = (obj) => {
                obj.success && obj.success({
                    networkType: 'wifi'
                });
            }
            createSwanPage().then(() => {
                const appConfig = window.masterManager.navigator.appConfig;
                expect(appConfig).toEqual(jasmine.any(Object));
                // expect(appConfig.preloadRule).toEqual(jasmine.any(Object));
                // expect(appConfig.subPackages).toEqual(jasmine.any(Array));
                
            });
            done();
        });
        
        it('preload parameters are correct & networkType is 4G', function (done) {
            window.swan.getNetworkType = (obj) => {
                obj.success && obj.success({
                    networkType: '4G'
                });
            }
            createSwanPage().then(() => {
                const appConfig = window.masterManager.navigator.appConfig;
                expect(appConfig).toEqual(jasmine.any(Object));
                // expect(appConfig.preloadRule).toEqual(jasmine.any(Object));
                // expect(appConfig.subPackages).toEqual(jasmine.any(Array));
                
            });
            done();
        });
    });
});