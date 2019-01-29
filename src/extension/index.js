/**
 * @file 宿主扩展的加载、注册、解析
 * @author sunweinan(sunweinan@baidu.com)
 */
import {loader} from '../utils';
import {require} from '../utils/module';
import EventsEmitter from '../utils/events-emitter';

export default class Extension {

    /**
     * 构造函数
     *
     * @param {Object} context - 全局环境
     * @param {Object} swaninterface - 端能力对象
     */
    constructor(context, swaninterface) {
        this.context = context;
        this.swaninterface = swaninterface;
    }

    /**
     * 向boxjs中注入底层方法，供调用
     *
     * @param {Object} service - 宿主extension中的service对象
     */
    injectHostMethods(service) {
        let {
            hostMethodDescriptions = []
        } = service;
        try {
            this.swaninterface.boxjs.extend(
                hostMethodDescriptions.map(description => {
                    // 默认args直接传data即可
                    let {
                        args = [{
                            name: 'data',
                            value: 'Object='
                        }]
                    } = description;
                    // 默认的name就是description本身，如果开发者有特殊要求会写成对象
                    let {
                        name = description
                    } = description;
                    // 最后配置文件要用的配置
                    return {
                        args,
                        name,
                        path: name,
                        authority: 'v26/swan'
                    };
                })
            );
        } catch (ex) {
            console.error(ex);
        }
    }

    /**
     * 向swan上挂载API，供开发者调用
     *
     * @param {Object} service - 宿主extension中的service对象
     */
    injectHostAPI(service) {
        const nameSpace = service.name;
        let swan = this.context.swan;
        let swanHostSpace = this.context.swan[nameSpace] = {};

        service.methods
            && Object
                .keys(service.methods)
                .forEach(apiName => {
                    const api = service.methods[apiName];
                    switch (typeof api) {

                        // 如果直接传function，默认直接挂载到namespace上
                        case 'function':
                            swanHostSpace[apiName] = api;
                            break;

                        // 正确逻辑
                        case 'object':
                            api.scope === 'root'
                                ? (swan[apiName] = api.method)
                                : (swanHostSpace[apiName] = api.method);
                            break;

                        // 格式错误
                        default:
                            console.error('api in extension-methods must function or object');
                            break;

                    }
                });

        // 在debug模式下，将extension信息提供给debug小程序以提示宿主
        if (!!JSON.parse(window._naSwan.getEnvVariables()).isDebugSdk) {
            this.context.swan._extensionSrc = service;
        }
    }

    /**
     * 注册扩展的 components
     *
     * @param {Object} service - 宿主extension中的service对象
     */
    injectHostComponents(service) {
        const nameSpace = service.name;
        Object
            .keys(service.components)
            .forEach(ComponentName => {

                let finalComponentName = ComponentName;

                if (service.components[ComponentName].scope !== 'root') {
                    finalComponentName = nameSpace + '-' + ComponentName;
                }

                this.context.componentFactory.componentDefine(
                    finalComponentName, service.components[ComponentName]
                );
            });
            this.context.componentFactory.getComponents();
    }

    /**
     * 获取宿主extension路径
     *
     * @return {string|boolean} 拼接结果
     */
    getExtensionPath() {
        try {
            // 获取客户端给出的初始化信息
            return JSON.parse(window._naSwan.getEnvVariables()).sdkExtension;
        } catch (ex) {
            return false;
        }
    }


    /**
     * 加载并使用宿主的extension包
     * @param {Object} context - 框架的master或slave对象
     */
    use(context) {
        const isSlave = !!context.registerComponents;
        const isMaster = !isSlave;

        // 获得extension路径
        const extensionPath = this.getExtensionPath();
        if (!extensionPath) {
            return;
        }

        // 加载css
        isSlave && loader.loadcss(`${extensionPath}/extension.css`);
        // 加载js
        loader.loadjs(`${extensionPath}/extension.js`)
            .then(() => {
                // 模块引入
                const service = require('swan-extension');
                // 在swan上挂载宿主的API
                this.injectHostAPI(service);
                // 注入底层方法
                this.injectHostMethods(service);
                // 组件注册
                isSlave && this.injectHostComponents(service);
                // 注入宿主的分享自定义方法
                isMaster && this.injectHostShareHook(service);
                // 统计逻辑
                isMaster && service.customLog(EventsEmitter.merge(
                    context.pageLifeCycleEventEmitter,
                    context.appLifeCycleEventEmitter,
                    context.swanEventsCommunicator,
                    context.context.swanEvents
                ));
            })
            .catch(console.error);
    }

    /**
     * 配置分享链接
     *
     * @param {Object} service - 宿主配置的extension中的service
     */
    injectHostShareHook(service) {
        this.getShareURL = service.getShareURL;
    }

    /**
     * 分享时使用，作为分享url过滤器，优先使用宿主的getShareURL方法
     *
     * @param {Object} userParams - 接入宿主的配置
     * @param {Object} appInfo - 当前的上下文环境信息
     * @return {Object} 处理后的分享参数
     */
    hostShareParamsProccess(userParams, appInfo) {
        if (typeof this.getShareURL === 'function') {
            return {
                ...userParams,
                forceReplaceShareUrl: true,
                ...this.getShareURL({
                    ...userParams,
                    appId: appInfo.appId,
                    scene: appInfo.scene
                })
            };
        }
        return userParams;
    }

}
