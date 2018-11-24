/**
 * @file 管理小程序的master(包括对于master的global的装饰，对于swan接口的装饰)
 *       小程序上使用的interface
 * @author houyu(houyu01@baidu.com)
 */
import {getAppMethods} from './app';
import {Navigator} from './navigator';
import EventsEmitter from '../utils/events-emitter';
import swanEvents from '../utils/swan-events';
import {define, require} from '../utils/module';
import Communicator from '../utils/communication';
import {absolutePathResolver} from '../utils/path';
import VirtualComponentFactory from './custom-component';
import {getCurrentPages, Page, slaveEventInit} from './page';
import {loader} from '../utils';

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

        // 监听app、page所有生命周期事件
        this.bindLifeCycleEvents();
        // 监听所有的slave事件
        const allSlaveEventEmitters = slaveEventInit(this);

        this.pageLifeCycleEventEmitter = allSlaveEventEmitters.pageLifeCycleEventEmitter;

        // 装饰当前master的上下文(其实就是master的window，向上挂方法/对象)
        this.context = this.decorateContext(context);

        // 解析宿主包
        this.useExtension();

        // 监听appReady
        this.listenAppReady();
        // 适配环境
        this.adaptEnvironment();
        swanEvents('masterPreloadGetMastermanager');
        swanEvents('masterPreloadEnd');
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
                        //配置项格式校验
                        if (!(item.packages instanceof Array)) {
                            return;
                        }
                        //预下载分包
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
                        })
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
            this.initRender(event);
            this.preLoadSubPackage();
        });
    }

    /**
     * 向boxjs中注入底层方法，供调用
     *
     * @param {Object} service - 宿主extension中的service对象
     */
    injectHostMethods(service) {
        let {hostMethodDescriptions = []} = service;
        try {
            this.swaninterface.boxjs.extend(
                hostMethodDescriptions.map(description => {
                    // 默认args直接传data即可
                    let {args = [{name: 'data', value: 'Object='}]} = hostMethodDescriptions;
                    // 默认的name就是description本身，如果开发者有特殊要求会写成对象
                    let {name = description} = description;
                    // 最后配置文件要用的配置
                    return {args, name, path: name, authority: 'v26/swan'};
                })
            );
        } catch (ex) {}
    }

    /**
     * 使用宿主的extension包
     */
    useExtension() {
        let ENV_VARIABLES = {};
        try {
            // 获取客户端给出的初始化信息
            ENV_VARIABLES = Object.assign(ENV_VARIABLES, JSON.parse(window._naSwan.getEnvVariables()));
        } catch (ex) {
            // 没有extension包的情况下直接返回
            return false;
        }

         // 加载js
        loader.loadjs(`${ENV_VARIABLES.sdkExtension}/service.js`)
            .then(() => {
                // 模块引入
                let service = require('swan-extension-service');
                let nameSpace = service.name;
                // API挂载
                this.context.swan[nameSpace] = this.context.swan[nameSpace] || {...service.methods};
                // 注入底层方法
                this.injectHostMethods(service);
                // 统计逻辑
                service.customLog(EventsEmitter.merge(
                    this.pageLifeCycleEventEmitter,
                    this.appLifeCycleEventEmitter,
                    this.swanEventsCommunicator,
                    this.context.swanEvents
                ));
            })
            .catch(console.error);
    }

    /**
     * 装饰当前的上下文环境
     *
     * @param {Object} context - 待装饰的上下文
     * @return {Object} 装饰后的上下文
     */
    decorateContext(context) {
        context.masterManager = this;
        context.define = define;
        context.require = require;
        context.swaninterface = this.swaninterface; // 远程调试工具的依赖
        context.swan = this.decorateSwan(Object.assign(this.swaninterface.swan, context.swan || {}));
        context.getCurrentPages = getCurrentPages;
        context.global = {};
        context.getCurrentPages = getCurrentPages;
        context.Page = Page;
        context.Component = this.virtualComponentFactory.defineVirtualComponent.bind(this.virtualComponentFactory);
        context.Behavior = this.virtualComponentFactory.defineBehavior.bind(this.virtualComponentFactory);
        Object.assign(context, this.getAppMethods());
        swanEvents('masterPreloadDecorateContext');
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
        swanEvents('masterActiveInitRender');
        // 压入initSlave
        this.navigator.pushInitSlave({
            pageUrl: initEvent.pageUrl,
            slaveId: +initEvent.wvID,
            root: initEvent.root,
            preventAppLoad: initEvent.preventAppLoad
        });

        this.appPath = initEvent.appPath;
        swanEvents('masterActivePushInitslave');
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
        return getAppMethods(this.swaninterface, this.appLifeCycleEventEmitter, this.lifeCycleEventEmitter);
    }

    /**
     * 将导出给用户的swan进行封装，补充一些非端能力相关的框架层能力
     * 后续，向对外暴露的swan对象上，添加框架级方时，均在此处添加
     *
     * @param {Object} [originSwan] 未封装过的，纯boxjs导出的swan对象
     * @return {Object} 封装后的swan对象
     */
    decorateSwan(originSwan) {
        const navigator = this.navigator;
        const getSlaveId = () => navigator.history.getTopSlaves()[0].getSlaveId();
        const operators = this.swanComponents.getContextOperators(this.swaninterface, this.communicator, getSlaveId);
        return Object.assign(originSwan, {
            navigateTo: navigator.navigateTo.bind(navigator),
            navigateBack: navigator.navigateBack.bind(navigator),
            redirectTo: navigator.redirectTo.bind(navigator),
            switchTab: navigator.switchTab.bind(navigator),
            reLaunch: navigator.reLaunch.bind(navigator),
            ...operators,
            reportAnalytics: (reportName, reportParams) => this.swanEventsCommunicator.fireMessage({
                type: 'SwanEvents',
                params: {
                    eventName: 'reportAnalytics',
                    e: {
                        reportName,
                        reportParams
                    }
                }
            }),
            onUserCaptureScreen: callback => {
                this.swaninterface.bind('onUserCaptureScreen', () => {
                    typeof callback === 'function' && callback();
                });
            }
        });
    }

    /**
     * 绑定生命周期事件
     */
    bindLifeCycleEvents() {
        this.lifeCycleEventEmitter = new EventsEmitter();
        this.swaninterface.bind('lifecycle', event => {
            this.lifeCycleEventEmitter.fireMessage({
                type: event.lcType + (event.lcType === 'onShow' ? event.wvID : ''),
                event
            });
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
        let errorListner = global;
        if (swanGlobal) {
            errorListner = swanGlobal['_naSwan'];
        }
        errorListner.addEventListener('error', e => {
            console.log('error:', e);
            global.myerror = e;
            let app = global.getApp();
            app && app._onAppError({
                appInfo: global.appInfo || {},
                event: e,
                type: 'onAppError'
            })
        });
    }
}
