describe('swan Page data operation', function () {

    function dispatchEvent(type, params) {
        var event = new Event(type);
        for (var i in params) {
            event[i] = params[i];
        }
        document.dispatchEvent(event);
    }


    it('setData', function (done) {
        let pageObject = null;
        define('pages/datatest/setdata',
            function (require, module, exports, define, swan, getApp,
                window, document, frames, self, location, navigator, localStorage, history, Caches
            ) {
                Page({
                    data: {
                        name: 'yican',
                        sex: [1, 0, 1, 1],
                        flag: true,
                        test: 'test',
                        attr: 'yican',
                        person: {
                            name: 'yican',
                            age: 18,
                            爱好: '滑雪',
                            with: {
                                tt: 'test',
                                dd: 'dd'
                            }
                        },
                        bigObj: {
                            name: 'hy',
                            age: 1,
                            height: 180
                        }
                    },
                    onLoad: function () {
                        pageObject = this;
                        setTimeout(() => {
                            this.setData({
                                attr: 'yican update',
                                test: 'test update',
                                sex: [1, 1, 0, 1],
                                person: {
                                    name: 'yican update',
                                    with: {
                                      tt: 'tt'
                                    }
                                },
                                name: ['john', 'leborn', 'james', 'yty', 'hy', 'test']
                            });
                        }, 100);
                    }
                });
            }
        );
        window.__swanRoute = 'pages/datatest/setdata';
        require('pages/datatest/setdata');

        // when client dispatch an ready event
        window.basePath = '';
        // dispatchEvent('AppReady', {
        //     wvID: '3',
        //     pageUrl: 'pages/datatest/setdata'
        // });
        setTimeout(() => {
            pageObject.setData({
                attr: 'yican update',
                test: 'test update',
                person: {
                    name: 'yican update',
                    with: {
                        tt: 'tt'
                    }
                },
                name: ['john', 'leborn', 'james', 'yty', 'hy', 'test']
            });
            // expect(pageObject.getData('attr')).toEqual('yican update');
        }, 200);

        setTimeout(() => {
            pageObject.pushData({
                company: 'baidu'
            });
            // expect(pageObject.getData('company')).toEqual('baidu');
            pageObject.popData({
                company: 'baidu'
            });

            pageObject.unshiftData({
                pos: 'xibeiwang'
            });
            pageObject.shiftData({
                pos: 'xibeiwang'
            });

            pageObject.removeAtData({
                name: 'yican'
            }, 1);

            pageObject.spliceData({
                name: 'yican'
            }, 1);

            // pageObject.createCanvasContext('myCanvas');
        }, 200);

        setTimeout(() => {
            pageObject.setData({
                attr: 'yican update',
                test: 'test update',
                person: {
                    name: 'yican update',
                    with: {
                      tt: 'tt'
                    }
                },
                name: ['john', 'leborn', 'james', 'yty', 'hy', 'test']
            });
            expect(pageObject.getData('attr')).toEqual('yican update');
        }, 200);
        done();
    });
});