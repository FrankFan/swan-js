/**
 * @file app的相关方法
 * @author houyu(houyu01@baidu.com)
 */
import {mixinLifeCycle} from './life-cycle';
import swanEvents from '../../utils/swan-events';

/**
 * 获取App信息(包含：appId,scene,scheme)
 *
 * @param {Object} swaninterface - 端能力接口
 * @return {Object} - 获取得到的App信息
 */
const getAppInfo = swaninterface => swaninterface.boxjs.data.get({name: 'swan-appInfoSync'});

/**
 * 绑定app的环境相关事件
 *
 * @param {Object} [appObject] - app对象的实例
 * @param {Object} [swaninterface] - swaninterface小程序底层接口
 */
const bindLifeCycleEvent = (appObject, swaninterface, lifeCycleEventEmitter) => {
    const appEventsToLifeCycle = ['onAppShow', 'onAppHide', 'onAppError', 'onPageNotFound'];

    appEventsToLifeCycle.forEach(eventName => {
        lifeCycleEventEmitter.onMessage(eventName, messages => {
            // 筛选出本次的onShow的对应参数
            let event = messages[0] ? messages[0].event : messages.event;
            appObject[`_${event.lcType}`]
                && appObject[`_${event.lcType}`]({
                    event,
                    appInfo: getAppInfo(swaninterface),
                    type: event.lcType
                });
        }, {listenPreviousEvent: true});
    });

    swaninterface
    .bind('onLogin', event => {
        appObject['_onLogin']({
            event,
            appInfo: getAppInfo(swaninterface),
            type: event.lcType
        });
    });
    swanEvents('masterPreloadInitBindingEnvironmentEvents');
};

/**
 * 获取所有的app操作方法(App/getApp)
 *
 * @param {Object} [swaninterface] - swan底层接口
 * @param {Object} [appLifeCycleEventEmitter] - app的数据流
 * @return {Object} 所有App相关方法的合集
 */
export const getAppMethods = (swaninterface, appLifeCycleEventEmitter, lifeCycleEventEmitter) => {
    let initedAppObject = null;

    const getApp = () => initedAppObject;

    const App = appObject => {
        // 将初始化之后的app对象，返回到上面，getApp时，可以访问
        // 获取app的相关信息，onLaunch是框架帮忙执行的，所以需要注入客户端信息
        const appInfo = getAppInfo(swaninterface);
        global.monitorAppid = appInfo['appid'];
        global.__swanAppInfo = appInfo;
        try {
            global.rainMonitor.opts.appkey = appInfo['appid'];
            global.rainMonitor.opts.cuid = appInfo['cuid'];
        } catch (e) {
            // avoid empty state
        }
        initedAppObject = mixinLifeCycle(appObject, appLifeCycleEventEmitter);
        bindLifeCycleEvent(initedAppObject, swaninterface, lifeCycleEventEmitter);

        // 触发launch事件
        initedAppObject._onAppLaunch({
            appInfo,
            event: {},
            type: 'onAppLaunch'
        });
        return initedAppObject;
    };

    return {App, getApp};
};
