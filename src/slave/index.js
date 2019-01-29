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
            } = JSON.parse(window._naSwan.getEnvVariables());
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
        swanEvents('slavePreloadListened');
        // 控制是否开启预取initData的开关
        let advancedInitDataSwitch = false;
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
                    loader.loadcss(`${appPath}/app.css`, 'slaveActiveAppCssLoaded'),
                    loader.loadcss(`${appPath}/${pagePath}.css`, 'slaveActivePageCssLoaded')
                ])
                .catch(() => {
                    console.warn('加载css资源出现问题，请检查css文件');
                })
                .then(() => {
                    // todo: 兼容天幕，第一个等天幕同步后，干掉
                    swanEvents('slaveActiveCssLoaded');
                    swanEvents('slaveActiveSwanJsStart');
                    loader.loadjs(`${appPath}/${pagePath}.swan.js`, 'slaveActiveSwanJsLoaded');
                });
            };
            (event.devhook === 'true' ? loadHook().then(loadUserRes).catch(loadUserRes) : loadUserRes());
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

        global.pageRender = (pageTemplate, templateComponents, customComponents, filters, modules) => {
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

            global.isNewTemplate = true;
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
            swanEvents('slaveActiveDefineComponentPage');
            // 获取page的组件类
            const Page = global.componentFactory.getComponents('page');

            // 初始化页面对象
            const page = new Page();
            swanEvents('slaveActiveConstructUserPage');

            // 调用页面对象的加载完成通知
            page.slaveLoaded();
            swanEvents('slaveActiveUserPageSlaveloaded');
            // 用于记录用户模板代码在开始执行到监听initData事件之前的耗时
            global.FeSlaveSwanJsInitEnd = Date.now();

            // 监听等待initData，进行渲染
            page.communicator.onMessage('initData', params => {
                swanEvents('slaveActiveReceiveInitData');
                try {
                    // 根据master传递的data，设定初始数据，并进行渲染
                    page.setInitData(params);
                    swanEvents('slaveActiveRenderStart');

                    // 真正的页面渲染，发生在initData之后
                    // 此处让页面真正挂载处于自定义组件成功引用其他自定义组件之后,
                    // 引用其它自定义组件是在同一时序promise.resolve().then里执行, 故此处attach时, 自定义组件已引用完成
                    setTimeout(() => {
                        page.attach(document.body);
                        // 通知master加载首屏之后的逻辑
                        page.communicator.sendMessage(
                            'master', {
                                type: 'slaveAttached',
                                slaveId: page.slaveId
                            }
                        );
                        swanEvents('slaveActivePageAttached');
                    }, 0);

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
            // 兼容部分安卓机划动问题
            document.body.addEventListener('touchmove', () => {});
        };
        browserPatch();
    }
}
