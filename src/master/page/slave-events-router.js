/**
 * @file 小程序slave中组件相关的事件的派发，到达master中
 *       需要转发给：开发者/私有对象/日志 进行对应处理
 * @author houyu(houyu01@baidu.com)
 */
import swanEvents from '../../utils/swan-events';

/**
 * slave的事件封装分发器，封装了大量的无逻辑公有方法
 *
 * @class
 */
export default class SlaveEventsRouter {
    constructor(masterManager, pageLifeCycleEventEmitter) {
        this.masterManager = masterManager;
        this.history = masterManager.navigator.history;
        this.slaveCommunicator = masterManager.communicator;
        this.pageLifeCycleEventEmitter = pageLifeCycleEventEmitter;
        swanEvents('masterPreloadConstructSlaveEventsRouter');
    }

    /**
     * 初始化所有页面级相关事件的绑定
     */
    initbindingEvents() {
        this.bindPrivateEvents();
        this.bindDeveloperEvents();
        this.bindEnvironmentEvents();
        this.bindLifeCycleEvent(this.pageLifeCycleEventEmitter);
        swanEvents('masterPreloadInitBindingEvents');
    }

    /**
     * 调用发生事件的页面的同名方法
     *
     * @param {string} slaveId 想要派发的页面的slave的id
     * @param {string} methodName 事件名称
     * @param {Object|null} options 派发事件的可配置项
     * @param {...*} args 透传的事件参数
     * @return {*} 调用私有方法后，私有方法的返回值
     */
    callEventOccurredPageMethod(slaveId, methodName, options = {}, ...args) {
        const occurredSlave = this.history.seek(slaveId);
        if (occurredSlave) {
            return occurredSlave.callPrivatePageMethod(methodName, options, ...args);
        }
        return null;
    }

    /**
     * 向所有slave，派发事件
     *
     * @param {string} methodName 事件名称
     * @param {Object|null} options 发事件的可配置项
     * @param {...*} args 透传的事件参数
     */
    dispatchAllSlaveEvent(methodName, options = {}, ...args) {
        this.history.each(slave => {
            slave.callPrivatePageMethod(methodName, options, ...args);
        });
    }

    /**
     * 框架使用的私有的事件的绑定
     */
    bindPrivateEvents() {
        this.slaveCommunicator.onMessage('abilityMessage', event => {
            if (event.value.type === 'rendered') {
                return;
            }
            try {
                this.callEventOccurredPageMethod(event.slaveId, event.value.type, {}, event.value.params);
            }
            catch (e) {
                console.error(e);
            }
        });
    }

    /**
     * 保证onShow执行在onReady之前
     */
    pageRendered(currentSlaveId) {
        this.slaveCommunicator.onMessage('abilityMessage', events => {
            if (Object.prototype.toString.call(events) !== '[object Array]') {
                events = [events];
            }
            events.forEach(event => {
                if (event.value.type === 'rendered' && event.slaveId === currentSlaveId) {
                    this.callEventOccurredPageMethod(event.slaveId, event.value.type, {}, event.value.params);
                }
            });
        }, {listenPreviousEvent: true});
    }

    /**
     * 调用用户在page实例上挂载的方法
     *
     * @param {String} [slaveId] - 要调用的页面实例的slaveId
     * @param {String} [methodName] - 要调用的page实例上的方法名
     * @param {...*} [args] - 透传的事件参数
     * @return {*} 函数调用后的返回值
     */
    callPageMethod(slaveId, methodName, ...args) {
        const occurredSlave = this.history.seek(slaveId);
        if (occurredSlave) {
            const occurredSlavePageObject = occurredSlave.userPageInstance;
            if (typeof occurredSlavePageObject[methodName] === 'function') {
                try {
                    return occurredSlavePageObject[methodName](...args);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        return null;
    }

    /**
     * 通知页面装载的自定义组件生命周期, 目前仅有show和hide
     *
     * @param {string} slaveId - 实例页面的slaveId
     * @param {string} methodName - [show | hide]
     * @param  {...*} args - 透传参数
     */
    callPageCustomComponentMethod(slaveId, methodName, ...args) {
        const occurredSlave = this.history.seek(slaveId);
        if (occurredSlave) {
            const customComponents = occurredSlave.userPageInstance.privateProperties.customComponents;
            if (customComponents) {
                Object.keys(customComponents).forEach(customComponentId => {
                    const customComponent = customComponents[customComponentId];
                    customComponent.pageLifetimes
                    && customComponent.pageLifetimes[methodName]
                    && customComponent.pageLifetimes[methodName].call(customComponent, ...args);
                });
            }
        }
        return null;
    }

    /**
     * 绑定开发者绑定的events
     */
    bindDeveloperEvents() {
        this.slaveCommunicator.onMessage('event', event => {
            const eventOccurredPageObject = this.history.seek(event.slaveId).getUserPageInstance();
            if (event.customEventParams) {
                const nodeId = event.customEventParams.nodeId;
                const reflectComponent = eventOccurredPageObject.privateProperties.customComponents[nodeId];
                if (reflectComponent[event.value.reflectMethod]) {
                    reflectComponent[event.value.reflectMethod]
                        .call(reflectComponent, event.value.e);
                }
            }
            else if (eventOccurredPageObject[event.value.reflectMethod]) {
                eventOccurredPageObject[event.value.reflectMethod]
                    .call(eventOccurredPageObject, event.value.e);
            }
        });
    }

    /**
     * 客户端触发的协议事件，非前端派发
     * 用于接收协议事件
     *
     */
    bindEnvironmentEvents() {
        this.masterManager.swaninterface
        .bind('sharebtn', event => {
            this.callEventOccurredPageMethod(event.wvID, 'share', {}, event, 'menu');
        })
        .bind('accountChange', event => {
            this.dispatchAllSlaveEvent('accountChange');
        })
        .bind('backtohome', ({url, from}) => {
            if (from !== 'menu' && url ===  this.history.getTopSlaves()[0].accessUri) {
                return;
            }
            this.masterManager.navigator.reLaunch({url: `/${url}`});
        });
    }

    bindLifeCycleEvent(pageLifeCycleEventEmitter) {

        const pageEventsToLifeCycle = ['onHide', 'onTabItemTap'];

        // 确保onShow在onLoad之后
        pageLifeCycleEventEmitter.onMessage('PagelifeCycle', events => {
            if (Object.prototype.toString.call(events) !== '[object Array]') {
                events = [events];
            }
            // 对于客户端事件做一次中转，因为前端有特殊逻辑处理(onShow必须在onLoad之后)
            const detectOnShow = event => {
                if (event.params.eventName === 'onLoad') {
                    let rendered = false;

                    // 兼容客户端在清除历史后首次进入小程序不派发onShow的问题
                    const renderTimeout = setTimeout(()=>{
                        if (!rendered) {
                            this.pageRendered(event.params.slaveId);
                            rendered = true;
                        }
                    }, 1000);

                    this.masterManager.lifeCycleEventEmitter.onMessage('onShow' + event.params.slaveId, paramsQueue => {
                        // 筛选出本次的onShow的对应参数
                        const e = [].concat(paramsQueue).filter(params => +params.event.wvID === +event.params.slaveId)
                            .slice(-1).map(params => params.event)[0];
                        this.callPageMethod(event.params.slaveId, '_onShow', {}, e);
                        !rendered && this.pageRendered(event.params.slaveId);
                        rendered = true;
                        clearTimeout(renderTimeout);
                        this.callPageCustomComponentMethod(event.params.slaveId, 'show', {}, e);
                    }, {listenPreviousEvent: true});
                }
            };
            events.forEach(detectOnShow);
        }, {listenPreviousEvent: true});

        pageLifeCycleEventEmitter.onMessage('onTabItemTap', ({event}) => {
            this.callPageMethod(event.wvID, '_onTabItemTap', event);
        }, {listenPreviousEvent: true});

        this.masterManager.lifeCycleEventEmitter.onMessage('onHide', e => {
            let event = e.event;
            this.callPageMethod(event.wvID, '_onHide', {}, event);
            this.callPageCustomComponentMethod(event.wvID, 'hide', {}, event);
        }, {listenPreviousEvent: true});

        this.masterManager.swaninterface
            .bind('onTabItemTap', event => {
                pageLifeCycleEventEmitter.fireMessage({
                    type: 'onTabItemTap',
                    event
                });
            });
    }
}
