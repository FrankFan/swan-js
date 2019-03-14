/**
 * @file 自定义组件单测
 * @author lvlei(lvleli03@baidu.com)
 */

describe('CustomComponent test', function() {
    const root = 'pages/custom/';
    const {dispatchEvent} = window.testutils.clientActions;
    function createSwanPage({
        uri = `${root}page1`,
        swanFormField = 'swan://form-field',
        swanComponentExport = 'swan://component-export'
    }) {
        return new Promise(resolve => {

            // 定义自定义组件
            const customRoot = 'components/custom';
            define(customRoot, function (require, module, exports, define, swan, getApp,
                window, document, frames, self, location, navigator, localStorage, history, Caches
            ) {

                // behavior1
                const myBehavior1 = Behavior({
                    data: {
                        content: 'behavior1'
                    },
                    properties: {
                        name: {
                            type: String,
                            value: 'behavior111'
                        }
                    },
                    attached() {},
                    methods: {
                        onTap(){}
                    },
                    pageLifetimes: {
                        show(){}
                    },
                    definitionFilter() {
                        
                    }
                });

                // behavior
                const myBehavior = Behavior({
                    behaviors: [myBehavior1],
                    data: {
                        content: 'content'
                    },
                    properties: {
                        name: {
                            type: String,
                            value: 'swan'
                        }
                    },
                    methods: {
                        onTap(){}
                    },
                    attached() {},
                    pageLifetimes: {
                        show(){}
                    },
                    definitionFilter(instance, definitionFilterArr) {
                        instance.setData('definitionFilter', 'modified definitionFilter');
                        instance.setData('definitionFilterArr', definitionFilterArr);
                    }
                });

                // 自定义组件逻辑, 其owner是自定义组件owner1
                Component({
                    properties: {
                        bar: {
                            type: String,
                            value: 'init bar',
                            observer: function(newVal, oldVal) {
                                
                            }
                        },
                        pig: {
                            type: String,
                            value: 'init pig',
                            observer: function() {
                                this.setData('hasFnObserverCalled', true);
                            }
                        },
                        tom: {
                            type: String,
                            value: 'init tom',
                            observer: 'observerCb'
                        },
                        jack: {
                            type: String,
                            value: 'init jack',
                            observer: 'observerCb'
                        }
                    },
                    data: {
                        content: 'content',
                        externalClass: 'available-class',
                        definitionFilter: 'init definitionFilter',
                        definitionFilterArr: null,
                        groupSetDataCount: 0,
                        createdCount: 0,
                        attachedCount: 0,
                        readyCount: 0,
                        detachedCount: 0,
                        showCount: 0,
                        hideCount: 0
                    },
                    options: {
                        addGlobalClass: true
                    },
                    observerCb() {
                        this.setData('observerCalledTime', true);
                    },
                    externalClasses: ['external-class'],
                    behaviors: [myBehavior, swanFormField, swanComponentExport],
                    attached() {},
                    ready() {},
                    methods: {
                        onTap(){}
                    },
                    pageLifetimes: {
                        show(){}
                    },
                    export() {
                        return {name: 'custom-export'}
                    }
                });
            });
            window.__swanRoute = customRoot;
            window.usingComponents = ['components/owner1/owner1'];
            require(customRoot);

            // 定义owner1自定义组件, 其owner是自定义组件owner2
            const owner1CustomRoot = 'components/owner1/owner1';
            define(owner1CustomRoot, function (require, module, exports, define, swan, getApp,
                window, document, frames, self, location, navigator, localStorage, history, Caches
            ) {
                Component({
                    properties: {
                    },
                    data: {
                        content: 'owner1'
                    },
                    messages: {
                        owner1Custom() {
                            
                        },
                        '*': function() {
                            
                        }
                    },
                    export() {
                        return {
                            name: 'owner1-export'
                        }
                    }
                });
            });
            window.__swanRoute = owner1CustomRoot;
            window.usingComponents = ['components/custom'];
            require(owner1CustomRoot);

            // 定义owner2自定义组件
            const owner2CustomRoot = 'components/owner2/owner2';
            define(owner2CustomRoot, function (require, module, exports, define, swan, getApp,
                window, document, frames, self, location, navigator, localStorage, history, Caches
            ) {
                Component({
                    properties: {
                    },
                    data: {
                        content: 'owner2'
                    }
                });
            });
            window.__swanRoute = owner2CustomRoot;
            window.usingComponents = [];
            require(owner2CustomRoot);

            // 注册页面
            window.define(uri, () => {
                Page({
                });
            });
            window.__swanRoute = uri;
            window.usingComponents = [customRoot];
            require(uri);

            // 下发appReady
            dispatchEvent('AppReady', {
                root: '',
                appPath: 'http://localhost:9876/base/test/util',
                pageUrl: uri,
                wvID: '666',
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

    function getCustomInstance(selectId) {
        const customComponentPageInstance = window.getInstance('pages/custom/page1');
        const onPageRender = customComponentPageInstance.privateMethod.onPageRender;
        customComponentPageInstance.privateProperties.customComponents = {};
        onPageRender.call(customComponentPageInstance, {
            customComponents: [{
                componentName: "custom",
                componentPath: "components/custom",
                nodeId: "_f4213",
                id: "_f4213",
                is: "components/custom",
                dataset: {},
                className: 'test-class',
                data: {
                    propsName: 'ceshi'
                },
                ownerId: '_111',
                parentId: '_222'
            }, {
                componentName: "owner1",
                componentPath: "components/owner1/owner1",
                nodeId: "_111",
                id: "_111",
                is: "components/owner1/owner1",
                dataset: {},
                className: 'owner1-test-class',
                data: {
                    propsName: 'owner1Val'
                },
                ownerId: '_333',
                parentId: '_444',
            }, {
                componentName: "owner2",
                componentPath: "components/owner2/owner2",
                nodeId: "_333",
                id: "_333",
                is: "components/owner2/owner2",
                dataset: {},
                className: 'owner2-test-class',
                data: {
                    propsName: 'owner2Val'
                },
                ownerId: '_555',
                parentId: '_666',
            }]
        });
        return customComponentPageInstance.privateProperties.customComponents[selectId];
    }
    beforeEach(() => {
        const historyStack = window.getHistoryStack();
        if (historyStack && historyStack.length !== 0) {
            historyStack.forEach(item => item.close());
            window.masterManager.navigator.history.historyStack = [];
        }
    });

    /* ==================================*/
    /* =====        测试开始        ===== */
    /* =====                       ===== */
    /* ===== 有一部分在component模块 ===== */
    /* ================================= */

    // test entry
    describe('Custom component entry test', () => {
        it('Custom component entry should be correct', function (done) {
            createSwanPage({}).then(() => {
                const customComponentPageInstance = window.getInstance('pages/custom/page1');
                const onPageRender = customComponentPageInstance.privateMethod.onPageRender;
                expect(onPageRender).toEqual(jasmine.any(Function));
            });
            done();
        });
    });

    describe('Custom component instance test', () => {
        it('Custom Component Instance\'s type is right', function (done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(customComponentInstance).toEqual(jasmine.any(Object));
            });
            done();
        });
    });
    describe('Custom component initialization data test', () => {
        it('should hava right id|is|dataset|ownerId|nodeId|parentId|componentName', function (done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(customComponentInstance.id).toEqual('_f4213');
                expect(customComponentInstance.is).toEqual('components/custom');
                expect(customComponentInstance.dataset).toEqual(jasmine.any(Object));
                expect(customComponentInstance.ownerId).toEqual('_111');
                expect(customComponentInstance.nodeId).toEqual('_f4213');
                expect(customComponentInstance.parentId).toEqual('_222');
                expect(customComponentInstance.componentName).toEqual('custom');
            });
            done();
        });
    });

    describe('Custom component built-in behavior swanComponentExport test', () => {
        it(`should hava swanComponentExport`, function (done) {
            createSwanPage({}).then(() => {
                const customComponentPageInstance = window.getInstance('pages/custom/page1');
                const selectComponent = customComponentPageInstance.selectComponent;
                expect(selectComponent).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('can swanComponentExport intercept SelectComponent', function (done) {
            createSwanPage({}).then(() => {
                const customComponentPageInstance = window.getInstance('pages/custom/page1');
                const selectComponent = customComponentPageInstance.selectComponent;
                const selectRes = selectComponent.call(customComponentPageInstance, '#_f4213');
                expect(selectRes.name).toEqual('custom-export');
            });
            done();
        });
    });

    describe('Custom component data test', () => {
        it('customComponent setData, its parametric types is string ', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.setData('content', 'after-content_0');
                const afterContent = customComponentInstance.data.content;
                expect(afterContent).toEqual('after-content_0');
            });
            done();
        });

        it('customComponent setData, its parametric types is object', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.setData({content: 'after-content_1'});
                const afterContent = customComponentInstance.data.content;
                expect(afterContent).toEqual('after-content_1');
            });
            done();
        });

        it('can proxy data', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.data = 'modified data';
                const _data = customComponentInstance._data;
                expect(_data).toEqual(jasmine.any(Object));
                expect(_data.raw).toEqual('modified data');
            });
            done();
        });
    });

    describe('Custom component properties test', () => {
        it('can proxy properties\' getter', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const properties = customComponentInstance.properties;
                expect(properties).toEqual(jasmine.any(Object));
                expect(properties.bar).toEqual('init bar');
            });
            done();
        });

        it('can proxy properties\' setter', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.properties = 'modified properties';
                const _data = customComponentInstance._data;
                expect(_data).toEqual(jasmine.any(Object));
                expect(_data.raw).toEqual('modified properties');
            });
            done();
        });

        it('can proxy properties\' prop setter', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.properties.bar = 'modified bar';
                const _data = customComponentInstance._data;
                expect(_data).toEqual(jasmine.any(Object));
                expect(_data.raw.bar).toEqual('modified bar');
            });
            done();
        });
        
    });

    describe('Custom component properties\' observer test', () => {
        it('observer\'s type is function', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(tom.value).toEqual('init pig');
                customComponentInstance.properties.tom = 'modified pig';
                const _data = customComponentInstance._data;
                expect(_data).toEqual(jasmine.any(Object));
                const {tom} = _data.raw;
                expect(tom).toEqual(jasmine.any(Object));
                expect(tom.observer).toEqual(jasmine.any(String));
                expect(tom.value).toEqual('modified pig');
                expect(customComponentInstance.hasFnObserverCalled).toEqual(true);
            });
            done();
        });

        it('observer\'s type is string', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(tom.value).toEqual('init tom');
                customComponentInstance.properties.tom = 'modified tom';
                const _data = customComponentInstance._data;
                expect(_data).toEqual(jasmine.any(Object));
                const {tom} = _data.raw;
                expect(tom).toEqual(jasmine.any(Object));
                expect(tom.observer).toEqual(jasmine.any(String));
                expect(tom.value).toEqual('modified tom');
                expect(customComponentInstance.hasStrObserverCalled).toEqual(true);
            });
            done();
        });
    });

    describe('Custom component addGlobalClass test', () => {
        it('customComponent addGlobalClass', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const options = customComponentInstance.options;
                expect(options).toEqual(jasmine.any(Object));
                expect(options.addGlobalClass).toEqual(true);
            });
            done();
        });
    });

    describe('Custom component externalClasses test', () => {
        it('customComponent externalClasses', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const {externalClasses} = customComponentInstance;
                expect(externalClasses).toEqual(jasmine.any(Array));
            });
            done();
        });
    });
    
    describe('Custom component built-in methods test', () => {
        it('triggerEvent', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.triggerEvent('custom', {});
                expect(customComponentInstance.triggerEvent).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('dispatch event is exist', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.dispatch('owner1Custom', {});
                expect(customComponentInstance.dispatch).toEqual(jasmine.any(Function));
            });
            done();
        });
        
        it('dispatch event is not exist', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.dispatch('notNormalName', {});
                expect(customComponentInstance.dispatch).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('parent component dispatch event', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_111');
                customComponentInstance.dispatch('notNormalName', {});
                expect(customComponentInstance.dispatch).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('selectAllComponents', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_111');
                const selectRes = customComponentInstance.selectAllComponents('#_f4213');
                expect(customComponentInstance.selectAllComponents).toEqual(jasmine.any(Function));
                expect(selectRes).toEqual(jasmine.any(Array));
            });
            done();
        });

        it('selectComponent', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_111');
                const resData = customComponentInstance.selectComponent('#_f4213');
                expect(customComponentInstance.selectComponent).toEqual(jasmine.any(Function));
                expect(resData).toEqual(jasmine.any(Object));
            });
            done();
        });

        it('selectComponent can be intercepted', function(done) {
            createSwanPage({
                swanFormField: 'undefined',
                swanComponentExport: 'undefined'
            }).then(() => {
                const customComponentInstance = getCustomInstance('_111');
                const selectComponent = customComponentInstance.selectComponent;
                const selectRes = selectComponent('#_f4213');
                expect(selectComponent).toEqual(jasmine.any(Function));
                expect(selectRes).toEqual(jasmine.any(Object));
            });
            done();
        });

        it('createSelectorQuery', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.createSelectorQuery('#customId');
                expect(customComponentInstance.createSelectorQuery).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('createIntersectionObserver', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.createIntersectionObserver('#customId');
                expect(customComponentInstance.createIntersectionObserver).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('propsChange', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(customComponentInstance.data.jack).toEqual('init jack');
                customComponentInstance._propsChange({
                    key: 'jack',
                    value: 'modified jack'
                });
                expect(customComponentInstance._propsChange).toEqual(jasmine.any(Function));
                expect(customComponentInstance.data.jack).toEqual('modified jack');
            });
            done();
        });

        it('hasBehavior', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                customComponentInstance.hasBehavior('#customId');
                const hasBehavior = customComponentInstance.hasBehavior();
                expect(customComponentInstance.hasBehavior).toEqual(jasmine.any(Function));
                expect(hasBehavior).toEqual(true);
            });
            done();
        });

        it('groupSetData', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                expect(customComponentInstance.data.groupSetDataCount).toEqual(0);
                customComponentInstance.groupSetData(() => {
                    const groupSetDataCount = customComponentInstance.data.groupSetDataCount + 1;
                    customComponentInstance.setData('groupSetDataCount', groupSetDataCount);
                });
                expect(customComponentInstance.data.groupSetDataCount).toEqual(1);
                expect(customComponentInstance.groupSetData).toEqual(jasmine.any(Function));
            });
            done();
        });

        it('detached', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const privateMethod = customComponentInstance.pageinstance.privateMethod;
                privateMethod.customComponentEvent({
                    params: 'customComponent:detached'
                });
            });
            done();
        });
    });
    
    describe('Custom component lifetimes', () => {
        it('detached', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const privateMethod = customComponentInstance.pageinstace.privateMethod;
                expect(privateMethod.customComponentEvent).toEqual(jasmine.any(Function));
                privateMethod.customComponentEvent({
                    type: 'customComponent:detached',
                    nodeId: '_f4213'
                });
                privateMethod.customComponentEvent({
                    type: 'customComponent:_propsChange',
                    nodeId: '_f4213'
                });

            });
            done();
        });
    });
    
    describe('Custom component getCustomComponentsData', () => {
        it('getCustomComponentsData', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const privateMethod = customComponentInstance.pageinstace.privateMethod;
                const mockUsingComponents = ['components/custom'];
                privateMethod.getCustomComponentsData(mockUsingComponents, masterManager.communicator);
                // todo
            });
            done();
        });
    });

    describe('Tested in component module', () => {
        it('component module test', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                masterManager.virtualComponentFactory.getComponentData('components/custom');
                const resData = masterManager.virtualComponentFactory.getDataValues({name: 'mary'});
                expect(resData).toEqual(jasmine.any(Object));
                expect(customComponentInstance).toEqual(jasmine.any(Object));
                expect(resData.name).toEqual('mary');
            });
            done();
        });

        it('Testing non-existent custom components', function(done) {
            createSwanPage({}).then(() => {
                const customComponentInstance = getCustomInstance('_f4213');
                const resData = masterManager.virtualComponentFactory.getComponentData('components/non-existent/non-existent');
                expect(resData).toEqual(jasmine.any(Object));
                expect(Object.keys(resData).length).toEqual(0);
            });
            done();
        });
    });
    
});