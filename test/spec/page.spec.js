describe('', function() {
    const root = 'pages/page/';
    const dispatchEvent = window.testutils.clientActions.dispatchEvent;
    function createSwanPage(uri = `${root}page1`) {
        return new Promise(resolve => {
            window.define(uri, () => new window.Page({
                data: {
                    status: 'init'
                },
                pageObj: {
                    name: 'yican'
                }
            }));
            window.__swanRoute = uri;
            require(uri);
            dispatchEvent('AppReady', {
                root: '',
                appPath: 'http://localhost:9876/base/test/util',
                pageUrl: uri,
                wvID: '555',
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
    });
    describe('swan Page lifycycle should be normal', () => {
            
        it('Page function and its data exist', function (done) {
            createSwanPage().then(() => {
                const rendered = window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('rendered');
                const reachBottom = window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('reachBottom');
                const share = window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('share');
                const pullDownRefresh = window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('pullDownRefresh');
                const onPageScroll = window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('onPageScroll', {}, {
                    event: 'onPageScroll'
                });
                const navigateArr = ['navigate', 'redirect', 'switchTab', 'reLaunch', ''];
                navigateArr.forEach(item => {
                    window.masterManager.navigator.history.historyStack[0].getCurrentChildren().callPrivatePageMethod('navigate', {}, {
                        openType: item,
                        uri: 'pages/datatest/datatest'
                    });
                });
                expect(Page).toEqual(jasmine.any(Function));
                expect(Page().data).toEqual(jasmine.any(Object));
                expect(Page().uri).toEqual(jasmine.any(String));
                expect(Page().usingComponents).toEqual(jasmine.any(Array));
                
            });
            done();
        });
        it('Page setData|getData', function(done) {
            createSwanPage().then(() => {
                let instance = window.getInstance('555');
                expect(instance).toEqual(jasmine.any(Object));
                expect(instance.data).toEqual(jasmine.any(Object));
                expect(instance.setData).toEqual(jasmine.any(Function));
                expect(instance.getData).toEqual(jasmine.any(Function));
                expect(instance.getData('status')).toEqual('init');
        
                /* Uncaught TypeError: Cannot read property 'contentWindow' of null thrown */
                instance.setData('status', 'modified');
                expect(instance.getData('status')).toEqual('modified');
                expect(instance.getData('status')).toEqual(instance.data.status);
                done();
            });
        });
    });
});