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
        this.context.swaninterface = swaninterface; //远程调试用
        this.swaninterface = swaninterface;
        this.swanComponents = swanComponents;
        this.useExtension();
        this.listenPageReady(global);
        swanEvents('slavePreloadEnd');
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
     * 解析宿主扩展文件
     */
    useExtension() {
        let ENV_VARIABLES = {};
        try {
            // 获取客户端给出的初始化信息
            ENV_VARIABLES = Object.assign(ENV_VARIABLES, JSON.parse(window._naSwan.getEnvVariables()));
        } catch (ex) {
            // 没有extension包的情况下直接返回，并注册其他组件。
            this.registerComponents();
            return false;
        }
        // 加载css
        loader.loadcss(`${ENV_VARIABLES.sdkExtension}/view.css`);
        // 加载js
        this.loadingExtension = Promise
            .all([
                loader.loadjs(`${ENV_VARIABLES.sdkExtension}/service.js`),
                loader.loadjs(`${ENV_VARIABLES.sdkExtension}/view.js`)
            ])
            .then(() => {
                // 模块引入
                const service = require('swan-extension-service');
                const view = require('swan-extension-view');
                const nameSpace = service.name;
                // API挂载
                this.context.swan[nameSpace] = this.context.swan[nameSpace] || {...service.methods};
                // 注入底层方法
                this.injectHostMethods(service);
                // 组件注册
                this.extensionComponents = {};
                Object
                    .keys(view.components)
                    .forEach(ComponentName => {
                        this.extensionComponents[nameSpace + '-' + ComponentName] = view.components[ComponentName];
                    });
            })
            .catch(console.error)
            .finally(()=>{
                this.registerComponents();
            });

    }

    /**
     * 监听pageReady，触发整个入口的调起
     * @param {Object} [global] 全局对象
     */
    listenPageReady(global) {
        swanEvents('slavePreloadListened');
        this.swaninterface.bind('PageReady', event => {
            swanEvents('slaveActiveStart',{
                pageInitRenderStart: Date.now() + ''
            });
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
                    /* eslint-disable */
                    __san_devtool__.emit('san', san);
                    /* eslint-enable */
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
        this.extensionComponents = this.extensionComponents || {};
        swanEvents('slavePreloadGetComponents');
        const componentDefaultProps = {swaninterface};
        const componentFactory = getComponentFactory(componentDefaultProps, {...componentProtos, ...this.extensionComponents}, this.swanComponents.getBehaviorDecorators());

        global.componentFactory = componentFactory;

        global.pageRender = (pageTemplate, templateComponents, customComponents, filters, modules) => {
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
                    console.log(e)
                    global.errorMsg['renderError'] = e;
                }
            }, {listenPreviousEvent: true});

            swanEvents('slaveActiveJsParsed');
            if (global.PageComponent) {
                Object.assign(global.PageComponent.components, customComponents);
            }
        };

        let debugInfo = '';
        try {
            debugInfo = sessionStorage.getItem('debugInfo');
        }
        catch (e) {
            console.log('no-debuging')
        }
        if (debugInfo) {
            const event = new Event('PageReady');
            event.appPath = debugInfo.split('|debug|')[0];
            event.onReachBottomDistance = '50';
            event.pagePath = debugInfo.split('|debug|')[1];
            document.dispatchEvent(event);
        }
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
