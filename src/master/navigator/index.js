/**
 * @file swan's navigator interface for user
 * @author houyu(houyu01@baidu.com)
 */
import Slave from './slave';
import History from './history';
import TabSlave from './tab-slave';
import {pathResolver, parseUrl} from '../../utils';
import swanEvents from '../../utils/swan-events';
import splitAppAccessory from '../../utils/splitapp-accessory';

export class Navigator {
    constructor(swaninterface, context) {
        this.history = new History();
        this.swaninterface = swaninterface;
        this.context = context;
        this.backToHomeEventStatus = false;
    }
    setAppConfig(appConfig) {
        // 第一次从客户端获取到appConfig
        this.appConfig = appConfig;
    }

    /**
     * 获取backtohome事件触发标识
     * @return {boolean} 是否存在
     */
    getBackToHomeEventStatus() {
        return this.backToHomeEventStatus;
    }

    /**
     * 设置backtohome事件触发标识
     * @param {boolean} [value] - 设置的参数
     */
    setBackToHomeEventStatus(value) {
        this.backToHomeEventStatus = value;
    }

    /**
     * 初始化第一个slave
     * @param {Object} [initParams] - 初始化的参数
     */
    pushInitSlave(initParams) {
        // Route事件监听开启
        this.listenRoute();

        swanEvents('masterActiveCreateInitSlave');

        // 根据appConfig判断时候有appjs拆分逻辑
        // 如果包含splitAppJs字段，且不分包，则为拆分app.js
        if (this.appConfig.splitAppJs && !this.appConfig.subPackages) {
            splitAppAccessory.allJsLoaded = false;
        }

        // 创建初始化slave
        this.initSlave = this.createInitSlave(initParams.pageUrl, this.appConfig);

        // slave的init调用
        this.initSlave
            .init(initParams)
            .then(() => {
                swanEvents('masterActiveCreateInitSlaveEnd');
                // 入栈
                this.history.pushHistory(this.initSlave);
                swanEvents('masterActivePushInitSlaveEnd');

                // 调用slave的onEnqueue生命周期函数
                this.initSlave.onEnqueue();
                swanEvents('masterActiveOnqueueInitSlave');
            });
    }

    /**
     * 调用用户自定义onPageNotFound方法
     *
     * @param {string} [parsed] - 跳转url
     */
    handleNavigatorError(parsed) {
        let app = this.context.getApp();
        app && app._onPageNotFound({
            appInfo: this.context.appInfo || {},
            event: {
                page: parsed.pathname,
                query: parsed.query,
                isEntryPage: false
            },
            type: 'onPageNotFound'
        });
    }

    /**
     * 前端预检查是否页面在配置项中
     *
     * @param {string} [url] - 跳转url
     * @return {boolean} 是否存在
     */
    preCheckPageExist(url) {
        let parsed = parseUrl(url);
        url = parsed.pathname;
        // 如果pages中存在该页面，则通过
        if (this.appConfig.pages.includes(url)) {
            return true;
        }

        // 有使用Component构造器构造的页面，则通过
        if (masterManager
            && masterManager.pagesQueue
            && Object.keys(masterManager.pagesQueue).includes(url)
        ) {
            return true;
        }

        // 获取分包中的path
        let subPackagesPages = [];
        this.appConfig.subPackages
        && this.appConfig.subPackages.forEach(subPackage => {
            // 此处兼容两种配置
            let pages = subPackage.pages.map(page =>
                (subPackage.root + '/' + page).replace('//', '/')
            );
            subPackagesPages = subPackagesPages.concat(pages);
        });

        // 如果分包的pages中存在该页面，则通过
        if (subPackagesPages.includes(url)) {
            return true;
        }

        // 不通过，走路由失败的逻辑
        this.handleNavigatorError(parsed);
        return false;
    }

    targetPageOnHide() {
        const topSlave = this.history.getTopSlaves()[0];
        topSlave.hide();
    }

    targetPageOnShow() {
        const topSlave = this.history.getTopSlaves()[0];
        topSlave.show();
    }

    /**
     * 跳转到下一页的方法
     *
     * @param {Object} [params] - 跳转参数
     * @return {Promise}
     */
    navigateTo(params) {
        params.url = this.resolvePathByTopSlave(params.url);
        this.preCheckPageExist(params.url);
        const {url, slaveId} = params;
        const {appConfig, swaninterface} = this;
        const newSlave = new Slave({
            uri: url,
            slaveId,
            appConfig,
            swaninterface
        });
        const currentSlaveId = this.history.getCurrentSlaveId();
        const isPageLifeCycleRuning = this.history.seek(currentSlaveId).getLoadToReadyStatus();
        if (!isPageLifeCycleRuning) {
            return this.newSlaveOpen(newSlave, params);
        }
        this.context.masterManager.pageLifeCycleEventEmitter.onMessage('rendered', () => {
            return this.newSlaveOpen(newSlave, params);
        }, {once: true});
    }

    newSlaveOpen(newSlave, params) {
        // TODO: openinit openNext 判断有问题
        return newSlave.open(params)
            .then(res => {
                this.targetPageOnHide();
                const slaveId = res.wvID;
                // navigateTo的第一步，将slave完全实例化
                newSlave.setSlaveId(slaveId);
                // navigateTo的第二步，讲slave推入栈
                this.history.pushHistory(newSlave);
                // navigateTo的第三步，调用slave的onEnqueue生命周期函数
                newSlave.onEnqueue();
                return res;
            })
            .catch(console.log);
    }

    /**
     * 重定向方法，在当前页面刷新打开，而不是新创建一个slave
     *
     * @param {Object} params 重定向所需要的参数
     * @return {Promise}
     */
    redirectTo(params) {
        params.url = this.resolvePathByTopSlave(params.url);
        this.preCheckPageExist(params.url);
        const currentSlaveId = this.history.getCurrentSlaveId();
        const isOnloadToShow = this.history.seek(currentSlaveId).getOnloadToShowStatus();
        if (!isOnloadToShow) {
            return this.targetPageResolve(params);
        }
        this.history.seek(currentSlaveId).jumpOnReady();
        this.context.masterManager.pageLifeCycleEventEmitter.onMessage('onShowed', () => {
            this.history.seek(currentSlaveId).unWrapOnLoadToShow();
            this.history.seek(currentSlaveId).restoreOnReady();
            return this.targetPageResolve(params);
        }, {once: true});
    }
    targetPageResolve(params) {
        return this.history.historyStack.filter(slave =>
        !slave.isClosing)[this.history.historyStack.length - 1].redirect(params)
        .catch(console.log);
    }
    navigateBack(params = {}) {
        const topSlave = this.history.getTopSlaves()[0];
        // 将即将退栈的 slave 状态改为退栈中
        topSlave.isClosing = true;
        return this.swaninterface
            .invoke('navigateBack', params)
            // 完成退栈
            .then(() => topSlave.isClosing = false)
            .catch(() => topSlave.isClosing = false);
    }
    switchTab(params) {
        params.url = this.resolvePathByTopSlave(params.url);
        this.history.popTo(this.initSlave.getSlaveId());
        return this.initSlave
            .switchTab(params)
            .then(res => {
                return res;
            });
    }
    reLaunch(params = {}) {
        const currentSlaveId = this.history.getCurrentSlaveId();
        const isOnloadToShow = this.history.seek(currentSlaveId).getOnloadToShowStatus();
        if (!isOnloadToShow) {
            return this.reLaunchPageInstance(params);
        }
        this.history.seek(currentSlaveId).jumpOnReady();
        this.context.masterManager.pageLifeCycleEventEmitter.onMessage('onShowed', () => {
            this.history.seek(currentSlaveId).unWrapOnLoadToShow();
            this.history.seek(currentSlaveId).restoreOnReady();
            return this.reLaunchPageInstance(params);
        }, {once: true});
    }

    reLaunchPageInstance(params) {
        if (!params.url) {
            const topSlave = this.history.getTopSlaves()[0];
            params.url = topSlave.getFrontUri();
        }
        params.url = this.resolvePathByTopSlave(params.url);
        const targetSlave = this.getSlaveEnsure(params.url, true);
        this.targetPageOnHide();
        // reluanch的第一步，先把栈清空
        this.history.clear();
        return targetSlave.reLaunch(params)
            .then(res => {
                const slaveId = res.wvID;
                this.initSlave = targetSlave;
                // 然后重新入栈当前重新生成的slave
                this.history.pushHistory(targetSlave);
                // 调用重新入栈的生命周期方法
                targetSlave.onEnqueue();
                return res;
            });
    }

    listenRoute() {
        // 原生层传递过来的消息
        return this.swaninterface
            .invoke('onRoute', ({routeType, fromId, toId, toPage, toTabIndex}) => {
                swanEvents('pageSwitchStart', {
                    slaveId: toId,
                    timestamp: Date.now() + ''
                });
                this[`on${routeType}`].call(this, fromId, toId, toPage, toTabIndex);
            });
    }
    oninit(fromId, toId) {}
    onnavigateTo(fromId, toId) {}
    onredirectTo(fromId, toId) {}
    onreLaunch(fromId, toId) {}
    onnavigateBack(fromId, toId) {
        // 弹出delta个slave并挨个执行其close方法
        this.targetPageOnHide();
        this.history.popTo(toId);
        this.targetPageOnShow();
    }
    onswitchTab(fromId, toId, toPage, toTabIndex) {
        this.initSlave
            .onswitchTab({fromId, toId, toPage, toTabIndex})
            .then(e=>{
                this.context.masterManager.pageLifeCycleEventEmitter
                    .fireMessage({
                        type: 'onTabItemTap',
                        event: e,
                        from: 'switchTab'
                    });
            });
    }

    /**
     * 将传入的path以页面栈顶层为相对路径
     * @param {string} path - 需要解析的相对路径
     * @return {string} 解析后的全路径
     */
    resolvePathByTopSlave(path) {
        if (/^\//g.exec(path)) {
            return path.replace(/^\//g, '');
        }
        const topSlaveUri = this.history.getTopSlaves()[0].getUri().replace(/[^\/]*$/g, '');
        const uriStack = pathResolver(topSlaveUri, path, () => {
            console.error(`navigateTo:fail url "${path}"`);
        });
        return uriStack.join('/').replace(/^\//g, '');
    }

    /**
     * 从history栈中获取slave，如果获取不到，则产生新的slave
     *
     * @param {string} [url] 需要获取的slaveid
     * @param {boolean} [getSuperSlave] 是否需要获取叶子节点，还是需要获取composite就行
     * @return {Object} slave对象
     */
    getSlaveEnsure(url, getSuperSlave) {
        let targetSlave = this.history.seek(url, getSuperSlave);
        if (!targetSlave) {
            targetSlave = this.createInitSlave(url, this.appConfig);
        }
        return targetSlave;
    }

    /**
     * 产生初始化的slave的工厂方法
     *
     * @param {string} initUri 初始化的uri
     * @param {Object} appConfig 小程序配置的app.json中的配置内容
     * @return {Object} 一个slave或slaveSet
     */
    createInitSlave(initUri, appConfig) {
        let tabBarList = [];
        try {
            tabBarList = appConfig.tabBar.list;
        }
        catch (e) {}
        const initPath = initUri.split('?')[0];
        const currentIndex = tabBarList.findIndex(tab => tab.pagePath === initPath);
        const swaninterface = this.swaninterface;
        if (tabBarList.length > 1 && currentIndex > -1) {
            splitAppAccessory.tabBarList = tabBarList;
            return new TabSlave({
                list: tabBarList,
                currentIndex,
                appConfig,
                swaninterface
            });
        }
        return new Slave({
            uri: initUri,
            appConfig,
            swaninterface
        });
    }
}
