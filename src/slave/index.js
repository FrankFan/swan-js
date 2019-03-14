/**
 * @file slave's runtime js, it will be included in all slave pages
 * @author houyu(houyu01@baidu.com)
 */
import san from 'san';
import {loader} from '../utils';
import {define, require} from '../utils/module';
import swanEvents from '../utils/swan-events';
import {getComponentFactory} from './component-factory';
import {setPageBasePath, isIOS} from '../utils/platform';
import Extension from '../extension';
/* globals Bdbox_android_jsbridge */

/**
 * @class slave的入口
 */

export default class Slave {

    constructor(global, swaninterface, swanComponents) {
        swanEvents('slavePreloadStart');
        this.context = global;
        this.context.require = require;
        this.context.define = define;
        this.context.san = san;
        this.context.errorMsg = [];
        this.context.swan = swaninterface.swan;
        this.context.swaninterface = swaninterface; // 远程调试用
        this.swaninterface = swaninterface;
        this.swanComponents = swanComponents;
        this.openSourceDebugger();
        this.extension = new Extension(global, swaninterface);
        this.registerComponents();
        this.listenPageReady(global);
        this.extension.use(this);
        swanEvents('slavePreloadEnd');
    }

    /**
     * 开源宿主调试工具debug
     */
    openSourceDebugger() {
        try {
            const {
                isDebugSdk,
                ctsServerAddress = {},
                host, // IDE所在pc的host
                port, // IDE所在pc的port
                udid
            } = this.context._envVariables;
            if (!!isDebugSdk) {
                // 提供使用的udid和所通信pc地址，便于ws连接
                window._openSourceDebugInfo = {host, port: +port, udid};
                // cts 性能测试
                const slaveCtsAddrList = ctsServerAddress.slave;
                slaveCtsAddrList
                && Array.isArray(slaveCtsAddrList)
                && slaveCtsAddrList.forEach(src => {
                    src.trim() !== '' && loader.loadjs(`${src}?t=${Date.now()}`);
                });
            }
        } catch (err) {
            return false;
        }
    }

    /**
     * 监听pageReady，触发整个入口的调起
     * @param {Object} [global] 全局对象
     */
    listenPageReady(global) {
        // 控制是否开启预取initData的开关
        let advancedInitDataSwitch = false;
        let that = this;
        this.swaninterface.bind('PageReady', event => {
            swanEvents('slaveActiveStart', {
                pageInitRenderStart: Date.now() + ''
            });
            let initData = event.initData;
            if (initData) {
                try {
                    initData = JSON.parse(initData);
                    this.initData = initData;
                }
                catch (e) {
                    initData = null;
                }
            }
            if (advancedInitDataSwitch) {
                global.advancedInitData = this.initData;
            }

            const appPath = event.appPath;
            const pagePath = event.pagePath.split('?')[0];
            const onReachBottomDistance = event.onReachBottomDistance;

            // 给框架同学用的彩蛋
            const corePath = global.location.href
                .replace(/[^\/]*\/[^\/]*.html$/g, '')
                .replace(/^file:\/\//, '');
            global.debugDev = `deployPath=${appPath}\ncorePath=${corePath}`;

            // 给框架同学使用的刷新彩蛋
            sessionStorage.setItem('debugInfo', `${appPath}|debug|${pagePath}`);

            // 供组件中拼接绝对路径使用的全局信息
            global.pageInfo = {
                appPath,
                pagePath,
                onReachBottomDistance
            };
            let loadHook = () => {
                return loader.loadjs('../swan-devhook/slave.js').then(() => {
                    /* eslint-disable fecs-camelcase, no-undef */
                    __san_devtool__.emit('san', san);
                    /* eslint-enable fecs-camelcase, no-undef */
                });
            };

            let loadUserRes = () => {
                // 设置页面的基础路径为当前页面本应所在的路径
                // 行内样式等使用相对路径变成此值
                setPageBasePath(`${appPath}/${pagePath}`);
                swanEvents('slaveActivePageLoadStart');
                // 加载用户的资源
                Promise.all([
                    loader.loadcss(`${appPath}/app.css`, 'slaveActiveAppCssLoaded', [{
                        key: 'linkname',
                        value: 'app'
                    }]),
                    loader.loadcss(`${appPath}/${pagePath}.css`, 'slaveActivePageCssLoaded')
                ])
                .catch(() => {
                    console.warn('加载css资源出现问题，请检查css文件');
                })
                .then(() => {
                    swanEvents('slaveActiveCssLoaded');
                    swanEvents('slaveActiveSwanJsLoadStart');
                    loader.loadjs(`${appPath}/${pagePath}.swan.js`, 'slaveActiveSwanJsLoaded').then(() => {
                        try {
                            let pageContentInfo = that.context.require(`${pagePath}.swan`);
                            that.createAllComponents(pageContentInfo);
                        } catch (e) {
                            window.errorMsg['execError'] = e;
                        }
                    });
                });
            };
            (event.devhook === 'true' ? loadHook().then(loadUserRes).catch(loadUserRes) : loadUserRes());
        });
        swanEvents('slavePreloadPageReadyListened');
    }

    createAllComponents(pageContentInfo) {
        let componentFactory = window.componentFactory;
        let componentFragments = componentFactory.getAllComponents();
        // 当前页面使用的自定义组件
        let componentUsingComponentMap = pageContentInfo.componentUsingComponentMap;
        let pageContent = pageContentInfo.template;
        let isComponent = pageContentInfo.isComponent;
        if (isComponent) {
            pageContent = '<custom-component></custom-component>';
            componentUsingComponentMap = {};
            componentUsingComponentMap[pageContentInfo.componentPath] = ['custom-component'];
        }
        let initialFilters = pageContentInfo.initialFilters;
        let modules = pageContentInfo.pageModules;
        // 当前页面的自定义组件是否包含了自定义组件
        let pageComponentUsingCustomComponent = !!Object.keys(componentUsingComponentMap).length;
        Promise.resolve().then(() => {
            if (!pageComponentUsingCustomComponent) {
                return {
                    customComponents: {},
                    pageTemplateComponents: pageContentInfo.createTemplateComponent(componentFragments)
                };
            } else {
                let getComponentsForMap = Object.create(null);
                let templateComponents = Object.create(null);
                getComponentsForMap = componentFactory.getComponentsForMap(componentUsingComponentMap);
                return getComponentsForMap.then(customComponentsInfo => {
                    let customComponents = customComponentsInfo.customComponents;
                    let customComponentsSizeInfo = customComponentsInfo.customComponentsSizeInfo;
                    // 给页面template使用的组件赋值
                    Object.assign(templateComponents, componentFragments, customComponents);
                    let pageTemplateComponents = pageContentInfo.createTemplateComponent(templateComponents);
                    return {
                        customComponents: customComponents,
                        pageTemplateComponents: pageTemplateComponents,
                        customComponentsSizeInfo: customComponentsSizeInfo
                    };
                });
            }
        }).then(function (pageInfo) {
            window.pageRender(pageContent, pageInfo.pageTemplateComponents,
                pageInfo.customComponents, initialFilters, modules, 'newTemplate', pageInfo.customComponentsSizeInfo);
        }).catch(function (e) {
            window.errorMsg['execError'] = e;
            throw e;
        });
    }

    /**
     * 注册所有components(也包括顶层components -- page)
     */
    registerComponents() {
        const swaninterface = this.swaninterface;
        const {versionCompare, boxVersion} = this.swaninterface.boxjs.platform;
        const componentProtos = this.swanComponents.getComponents({
            isIOS: isIOS(),
            versionCompare,
            boxVersion
        });
        swanEvents('slavePreloadGetComponents');
        const componentDefaultProps = {swaninterface};
        const componentFactory = getComponentFactory(componentDefaultProps,
            {...componentProtos},
            this.swanComponents.getBehaviorDecorators());

        global.componentFactory = componentFactory;

        global.pageRender = (pageTemplate, templateComponents,
            customComponents, filters, modules, from, customComponentsSizeInfo) => {
            // 用于记录用户模板代码在执行pageRender之前的时间消耗，包括了pageContent以及自定义模板的代码还有filter在加载过程中的耗时
            global.FeSlaveSwanJsParseEnd = Date.now();
            let filtersObj = {};
            filters && filters.forEach(element => {
                let func = element.func;
                let module = element.module;
                filtersObj[element.filterName] = (...args) => {
                    return modules[module][func](...args);
                };
            });

            swanEvents('slaveActivePageRender', pageTemplate);
            // 定义当前页面的组件
            componentFactory.componentDefine(
                'page',
                {
                    template: `<swan-page tabindex="-1">${pageTemplate}</swan-page>`,
                    superComponent: 'super-page'

                },
                {
                    classProperties: {
                        components: {...componentFactory.getComponents(), ...templateComponents, ...customComponents},
                        filters: {
                            ...filtersObj
                        }
                    }
                }
            );
            swanEvents('slaveActiveDefinePageComponentEnd');
            // 获取page的组件类
            const Page = global.componentFactory.getComponents('page');

            // 初始化页面对象
            const page = new Page();
            swanEvents('slaveActivePageComponentInstantiated');

            // 调用页面对象的加载完成通知
            page.slaveLoaded();
            swanEvents('slaveActiveNoticeMasterSlaveloaded');
            // 用于记录用户模板代码在开始执行到监听initData事件之前的耗时
            global.FeSlaveSwanJsInitEnd = Date.now();

            // 监听等待initData，进行渲染
            page.communicator.onMessage('initData', params => {
                swanEvents('slaveActiveReceiveInitData');
                try {
                    // 根据master传递的data，设定初始数据，并进行渲染
                    page.setInitData(params);
                    swanEvents('slaveActiveRenderStart');

                    const attachPage = function () {
                        page.attach(document.body);
                        // 通知master加载首屏之后的逻辑
                        page.communicator.sendMessage(
                            'master', {
                                type: 'slaveAttached',
                                slaveId: page.slaveId
                            }
                        );
                        swanEvents('slaveActivePageAttached');
                    };
                    if (from === 'newTemplate') {
                        // 新编译优化后同步执行即可
                        attachPage();
                    } else {
                        // 真正的页面渲染，发生在initData之后
                        // 此处让页面真正挂载处于自定义组件成功引用其他自定义组件之后,
                        // 引用其它自定义组件是在同一时序promise.resolve().then里执行, 故此处attach时, 自定义组件已引用完成
                        setTimeout(() => {
                            attachPage();
                        }, 0);
                    }

                }
                catch (e) {
                    console.log(e);
                    global.errorMsg['renderError'] = e;
                }
            }, {listenPreviousEvent: true});

            // 如果已经有端上传来的initData数据，直接渲染
            if (global.advancedInitData) {
                let initData = global.advancedInitData;
                page.communicator.fireMessage({
                    type: 'initData',
                    value: initData.data,
                    extraMessage: {
                        componentsData: initData.componentsData
                    }
                });
            }

            swanEvents('slaveActiveJsParsed');
            if (global.PageComponent) {
                Object.assign(global.PageComponent.components, customComponents);
            }
            if (customComponentsSizeInfo) {
                swanEvents('customComponentStatistics', customComponentsSizeInfo);
            }
        };

        const compatiblePatch = () => {
            global.PageComponent = global.componentFactory.getComponents('super-page');
            global.PageComponent.components = global.componentFactory.getComponents();
            global.PageComponent.stabilityLog = global.PageComponent.stabilityLog || new Function();
        };
        compatiblePatch();

        /**
         * 修复浏览器兼容问题
         */
        const browserPatch = () => {
            // 长按时长
            const LONG_PRESS_TIME_THRESHOLD = 350;
            let timer = null;
            let time = {};
            // 兼容部分安卓机划动问题
            document.body.addEventListener('touchmove', () => {});
            document.body.addEventListener('touchstart', e => {
                const target = e.target;
                const touchstart = el => {
                    time.start = Date.now();
                    timer = setTimeout(() => {
                        let event = document.createEvent('Event');
                        event.initEvent('longtapevent', true, true
                        );
                        Object.assign(event, {
                            changedTouches: el.changedTouches
                        });
                        target.dispatchEvent(event);
                        target.removeEventListener('touchstart', touchstart);
                    }, LONG_PRESS_TIME_THRESHOLD);
                };
                const touchend =  el => {
                    time.end = Date.now();
                    clearTimeout(timer);
                    if (time.end - time.start < LONG_PRESS_TIME_THRESHOLD) {
                        let event = document.createEvent('Event');
                        event.initEvent('tapevent', true, true
                        );
                        Object.assign(event, {
                            changedTouches: el.changedTouches
                        });
                        target.dispatchEvent(event);
                        target.removeEventListener('touchend', touchend);
                        target.removeEventListener('touchstart', touchstart);
                    }
                };

                target.addEventListener('touchstart', touchstart);
                target.addEventListener('touchend', touchend);

            }, true);
        };
        browserPatch();
    }
}
