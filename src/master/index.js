/**
 * @file 管理小程序的master(包括对于master的global的装饰，对于swan接口的装饰)
 *       小程序上使用的interface
 * @author houyu(houyu01@baidu.com)
 */

/* globals swanGlobal*/
import {getAppMethods} from './app';
import {Navigator} from './navigator';
import EventsEmitter from '../utils/events-emitter';
import swanEvents from '../utils/swan-events';
import {define, require} from '../utils/module';
import Communicator from '../utils/communication';
import {absolutePathResolver} from '../utils/path';
import VirtualComponentFactory from './custom-component';
import {getCurrentPages, Page, slaveEventInit} from './page';
import {apiProccess} from './proccessors/api-proccessor';
import {loader} from '../utils';
import Extension from '../extension';
import firstRenderHookQueue from '../utils/firstRenderHookQueue';

export default class Master {

    constructor(context, swaninterface, swanComponents) {
        swanEvents('masterPreloadStart');
        this.handleError(context);
        this.swaninterface = swaninterface;
        this.swanComponents = swanComponents;
        this.pagesQueue = {};
        this.navigator = new Navigator(swaninterface, context);
        this.communicator = new Communicator(swaninterface);
        swanEvents('masterPreloadCommunicatorListened');

        this.swanEventsCommunicator = new EventsEmitter();
        this.virtualComponentFactory = new VirtualComponentFactory(swaninterface);
        swanEvents('masterPreloadVirtualComponentFactoryInstantiated');

        this.extension = new Extension(context, swaninterface);
        swanEvents('masterPreloadExtensionInstantiated');

        // perfAudit data hook
        this.perfAudit = {};

        // 监听app、page所有生命周期事件
        this.bindLifeCycleEvents();
        // 监听所有的slave事件
        const allSlaveEventEmitters = slaveEventInit(this);
        swanEvents('masterPreloadAllSlaveEventsListened');

        this.pageLifeCycleEventEmitter = allSlaveEventEmitters.pageLifeCycleEventEmitter;

        // 装饰当前master的上下文(其实就是master的window，向上挂方法/对象)
        this.context = this.decorateContext(context);
        swanEvents('masterPreloadContextDecorated');

        this.openSourceDebugger();

        // 监听appReady
        this.listenAppReady();
        swanEvents('masterPreloadAppReadyListened');

        // 监听首屏渲染
        this.listenFirstRender();

        // 适配环境
        this.adaptEnvironment();
        // 解析宿主包
        this.extension.use(this);

        swanEvents('masterPreloadEnd');
    }

    listenFirstRender() {
        this.swaninterface.invoke('onMessage', data => {
            if (data.type === 'slavePageComponentAttached' && !firstRenderHookQueue.firstRenderEnd) {
                firstRenderHookQueue.firstRenderEnd = true;
                while (!!firstRenderHookQueue.queue.length) {
                    let hook = firstRenderHookQueue.queue.shift();
                    hook.delay && hook.delay();
                }
            }
        });
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
                this.context.swan.openSourceDebug = {
                    isDebugSdk
                };
                // 提供使用的udid和和所通信pc地址，便于ws连接
                window._openSourceDebugInfo = {host, port: +port, udid};
                // cts 性能测试
                const masterCtsAddrList = ctsServerAddress.master;
                masterCtsAddrList
                && Array.isArray(masterCtsAddrList)
                && masterCtsAddrList.forEach(src => {
                    src.trim() !== '' && loader.loadjs(`${src}?t=${Date.now()}`);
                });
            }
        } catch (err) {
            return false;
        }
    }

    /**
     * 预下载分包
     */
    preLoadSubPackage() {
        const appConfig = JSON.parse(global.appConfig);
        //配置项格式校验
        if ((!appConfig.preloadRule || !appConfig.subPackages)
            || typeof appConfig.preloadRule !== 'object'
            || !(appConfig.subPackages instanceof Array)) {
            return;
        }

        // 获得网络状态
        swan.getNetworkType({
            success: function (res) {
                let packages = [];
                let rootConfigs = appConfig.subPackages.map(v => v.root);
                //遍历配置项
                Object
                    .keys(appConfig.preloadRule)
                    .forEach(key => {
                        let item = appConfig.preloadRule[key];
                        // 配置项格式校验
                        if (!(item.packages instanceof Array)) {
                            return;
                        }
                        // 预下载分包
                        item.packages.forEach(rootName => {
                            // 校验是否已定义此项分包，为用户配置容错
                            rootConfigs.includes(rootName)
                                // 校验是否配置重复
                                && !packages.includes(rootName)
                                // 校验网络状态
                                && (res.networkType === 'wifi' || item.network === 'all')
                                && packages.push(rootName)
                                && swan.loadSubPackage({
                                        root: rootName
                                    });
                        });
                    });
            }
        });
    }

    /**
     * 监听客户端的调起逻辑
     */
    listenAppReady() {
        this.swaninterface.bind('AppReady', event => {
            if (event.devhook === 'true') {
                if (swanGlobal) {
                    loader.loadjs('./swan-devhook/master.js');
                } else {
                    loader.loadjs('../swan-devhook/master.js');
                }
            }
            swanEvents('masterActiveStart');
            // 给三方用的，并非给框架用，请保留
            this.context.appConfig = event.appConfig;
            // 初始化master的入口逻辑
            swanEvents('masterActiveInitRenderStart');
            this.initRender(event);
            this.preLoadSubPackage();
        });
    }

    /**
     * 装饰当前的上下文环境
     *
     * @param {Object} context - 待装饰的上下文
     * @return {Object} 装饰后的上下文
     */
    decorateContext(context) {
        Object.assign(context, this.getAppMethods());
        context.masterManager = this;
        swanEvents('masterPreloadMountMastermanagerToGlobal');
        context.define = define;
        context.require = require;
        context.swaninterface = this.swaninterface; // 远程调试工具的依赖
        context.swan = this.decorateSwan(Object.assign(this.swaninterface.swan, context.swan || {}));
        context.getCurrentPages = getCurrentPages;
        context.global = {};
        context.Page = Page;

        context.Component = this.virtualComponentFactory
            .defineVirtualComponent.bind(this.virtualComponentFactory);

        context.Behavior = this.virtualComponentFactory
            .defineBehavior.bind(this.virtualComponentFactory);

        return context;
    }

    /**
     * 初始化渲染
     *
     * @param {Object} initEvent - 客户端传递的初始化事件对象
     * @param {string} initEvent.appConfig - 客户端将app.json的内容（json字符串）给前端用于处理
     * @param {string} initEvent.appPath - app在手机上的磁盘位置
     * @param {string} initEvent.wvID - 第一个slave的id
     * @param {string} initEvent.pageUrl - 第一个slave的url
     */
    initRender(initEvent) {
        // 设置appConfig
        this.navigator.setAppConfig({
            ...JSON.parse(initEvent.appConfig),
            ...{
                appRootPath: initEvent.appPath
            }
        });
        // 压入initSlave
        swanEvents('masterActivePushInitSlaveStart');
        this.navigator.pushInitSlave({
            pageUrl: initEvent.pageUrl,
            slaveId: +initEvent.wvID,
            root: initEvent.root,
            preventAppLoad: initEvent.preventAppLoad
        });

        this.appPath = initEvent.appPath;

    }

    /**
     * 当开发者调用了工程相对路径，前端需要将其处理为绝对路径，当是远程地址或绝对路径时则忽略
     *
     * @param {string} path - 用户传递的路径
     * @return {string} 计算出的文件的绝对路径
     */
    getPathFromFront(path) {
        const frontUri = this.navigator.history.getTopSlaves()[0].getFrontUri();
        return absolutePathResolver(this.appPath, frontUri, path);
    }

    /**
     * 获取所有App级相关的方法
     *
     * @return {Object} 用户App的操作相关方法集合
     */
    getAppMethods() {
        this.appLifeCycleEventEmitter = new EventsEmitter();
        return getAppMethods(
                this.swaninterface,
                this.appLifeCycleEventEmitter,
                this.lifeCycleEventEmitter
            );
    }

    /**
     * 将导出给用户的swan进行封装，补充一些非端能力相关的框架层能力
     * 后续，向对外暴露的swan对象上，添加框架级方时，均在此处添加
     *
     * @param {Object} [originSwan] 未封装过的，纯boxjs导出的swan对象
     * @return {Object} 封装后的swan对象
     */
    decorateSwan(originSwan) {
        return apiProccess(originSwan, {
            swanComponents: this.swanComponents,
            navigator: this.navigator,
            communicator: this.communicator,
            pageLifeCycleEventEmitter: this.pageLifeCycleEventEmitter,
            appLifeCycleEventEmitter: this.appLifeCycleEventEmitter,
            swanEventsCommunicator: this.swanEventsCommunicator,
            hostShareParamsProccess: this.extension.hostShareParamsProccess.bind(this.extension),
            swaninterface: this.swaninterface
        });
    }

    /**
     * 绑定生命周期事件
     */
    bindLifeCycleEvents() {
        this.lifeCycleEventEmitter = new EventsEmitter();
        // this.triggerBackToHomeEvent = false;
        const backToHomeStatus = this.navigator.getBackToHomeEventStatus();
        // 终极方案此处仅监听onAppShow和onAppHide
        let onAppShowTimes = 0;
        const appLifeCycleEvents = ['onAppShow', 'onAppHide', 'onAppError', 'onPageNotFound'];
        this.swaninterface.bind('lifecycle', event => {
            event.lcType === 'onAppShow' && onAppShowTimes++;
            const hasAppLifeCycle = appLifeCycleEvents.some(lifecycle => lifecycle === event.lcType);
            const canAppShowExcute = event.lcType === 'onAppShow' && onAppShowTimes < 2;
            if (!hasAppLifeCycle || canAppShowExcute) {
                return;
            }
            if (event.lcType === 'onAppHide') {
                this.lifeCycleEventEmitter.fireMessage({
                    type: 'onHide'
                });
            }
            this.lifeCycleEventEmitter.fireMessage({
                type: event.lcType,
                event
            });
            if (event.lcType === 'onAppShow' && !backToHomeStatus) {
                this.lifeCycleEventEmitter.fireMessage({
                    type: 'onShow'
                });
            }
        });
    }

    /**
     * 适配master上下文
     */
    adaptEnvironment() {
        this.swaninterface.adaptMaster();
    }


    /**
     * 捕获全局错误
     * @param {Object} [global] - 全局对象
     */
    handleError(global) {
        global.addEventListener('error', e => {
            global.myerror = e;
            let app = global.getApp();
            app && app._onAppError({
                appInfo: global.appInfo || {},
                event: e,
                type: 'onAppError'
            });
        });
    }
}
