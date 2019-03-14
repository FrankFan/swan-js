describe('', function() {
    const root = 'pages/lifecycle/';
    const {swan, swanInterface, getCurrentPages} = window;
    const dispatchEvent = window.testutils.clientActions.dispatchEvent;
    const testValMap = {
        mainOnLoad: 0,
        mainOnReady: 0,
        mainOnShow: 0,
        mainOnHide: 0,
        mainOnUnload: 0,
        mainOnPullDownRefresh: 0,
        mainOnTabItemTap: 0,
        mainOnPageScroll: 0,
        mainOnReachBottom: 0,
        mainOnShareAppMessage: 0
    }
    function createSwanPage(uri = `${root}page1`) {
        return new Promise(resolve => {
            window.define(uri, () => new window.Page({
                data: {
                    status: 'init'
                },
                onLoad: function () {
                    testValMap.mainOnLoad++;
                },
                onReady: function () {
                    testValMap.mainOnReady++;
                },
                onShow: function (e) {
                    testValMap.mainOnShow++;
                },
                onHide: function () {
                    testValMap.mainOnHide++;
                },
                onUnload: function () {
                    testValMap.mainOnUnload++;
                },
                onPullDownRefresh: function() {
                    testValMap.mainOnPullDownRefresh++;
                },
                onTabItemTap: function() {
                    testValMap.mainOnTabItemTap++;
                },
                onPageScroll: function() {
                    testValMap.mainOnPageScroll++;
                },
                onReachBottom: function() {
                    testValMap.mainOnReachBottom++;
                },
                onShareAppMessage: function() {
                    testValMap.mainOnShareAppMessage++;
                }
            }));
            window.__swanRoute = uri;
            require(uri);
            dispatchEvent('AppReady', {
                root: '',
                appPath: 'http://localhost:9876/base/test/util',
                pageUrl: uri,
                wvID: '222',
                appConfig: `{
                   "pages": [
                       "${root}page1",
                       "${root}page2"
                   ],
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
                    }
                }`
            });
            setTimeout(resolve, 5);
        });
    }
    beforeEach(() => {
        const historyStack = window.getHistoryStack();
        if (historyStack && historyStack.length !== 0) {
            historyStack.forEach(item => item.close());
            window.masterManager.navigator.history.historyStack = [];
        }
        testValMap.mainOnLoad = 0;
        testValMap.mainOnReady = 0;
        testValMap.mainOnShow = 0;
        testValMap.mainOnHide = 0;
        testValMap.mainOnUnload = 0;
        testValMap.mainOnPullDownRefresh = 0;
        testValMap.mainOnTabItemTap = 0;
        testValMap.mainOnPageScroll = 0;
        testValMap.mainOnReachBottom = 0;
        testValMap.mainOnShareAppMessage = 0;
    });
    describe('swan Page lifycycle should be normal', () => {
        it('check Page lifecycle', () => {
            createSwanPage().then(() => {
                expect(historyStack).toEqual(jasmine.any(Array));
                expect(historyStack.length).toBeGreaterThan(0);
                expect(testValMap.mainOnLoad).toEqual(1);
                expect(testValMap.mainOnReady).toEqual(0);
                expect(testValMap.mainOnShow).toEqual(0);
                expect(testValMap.mainOnHide).toEqual(0);
                expect(testValMap.mainOnUnload).toEqual(0);
            });
        });
        it('Page lifecycle onShow', function() {
            createSwanPage().then(() => {
                dispatchEvent('lifecycle', {
                    lcType: 'onShow',
                        wvID: '222'
                    });
                expect(testValMap.mainOnReady).toEqual(0);
            });
        });
        it('Page lifecycle onReady', function() {
            createSwanPage().then(() => {
                dispatchEvent('lifecycle', {
                    lcType: 'onReady', 
                    wvID: '222'
                });
                expect(testValMap.mainOnReady).toEqual(0);
            });
        });
        it('Page lifecycle onTabItemTap', function() {
            createSwanPage().then(() => {
                dispatchEvent('onTabItemTap', {
                    wvID: '222'
                });
                dispatchEvent('onTabItemTap', {
                    wvID: '222'
                });
                expect(testValMap.mainOnTabItemTap).toEqual(2);
            });
        });
        it('Page lifecycle onHide', function() {
            createSwanPage().then(() => {
                dispatchEvent('lifecycle', {
                    lcType: 'onHide', 
                    wvID: '222'
                });
                expect(testValMap.mainOnShow).toEqual(1);
                expect(testValMap.mainOnHide).toEqual(1);
            });
        });
        it('Page lifecycle onUnload', function() {
            createSwanPage().then(() => {
                const lifeCyclePageInstance = window.getInstance('222');
                lifeCyclePageInstance._onUnload();
                expect(testValMap.mainOnUnload).toEqual(1);
            });
        });
    });
    describe('swan Page event listeners should be normal', function() {
        it('Page onPullDownRefresh', function() {
            createSwanPage().then(() => {
                const lifeCyclePageInstance = window.getInstance('222');
                lifeCyclePageInstance._pullDownRefresh({});
                expect(testValMap.mainOnPullDownRefresh).toEqual(1);
            });
        });
        it('Page onPageScroll', function() {
            createSwanPage().then(() => {
                const lifeCyclePageInstance = window.getInstance('222');
                lifeCyclePageInstance._onPageScroll({});
                expect(testValMap.mainOnPageScroll).toEqual(1);
            });
        });
        it('Page onReachBottom', function() {
            createSwanPage().then(() => {
                const lifeCyclePageInstance = window.getInstance('222');
                lifeCyclePageInstance._reachBottom({});
                expect(testValMap.mainOnReachBottom).toEqual(1);
            });
        });
        it('Page onShareAppMessage', function() {
            createSwanPage().then(() => {
                const lifeCyclePageInstance = window.getInstance('222');
                lifeCyclePageInstance._share({});
                expect(testValMap.mainOnShareAppMessage).toEqual(1);
            });
        });
        
    });
});