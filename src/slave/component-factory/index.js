/**
 * @file 小程序定义组件的入口
 * @author houyu(houyu01@baidu.com)
 */

import san from 'san';
import swanEvents from '../../utils/swan-events';
import Communicator from '../../utils/communication';

/**
 * san的组件工厂，生产组件类
 * @class
 */
export default class SanFactory {

    constructor(componentDefaultProps, behaviors) {

        this.behaviors = behaviors;
        this.componentDefaultProps = componentDefaultProps;
        this.componentInfos = {};

        // 依赖池，所有的组件需要的依赖是工厂提供的
        const communicator = Communicator.getInstance(this.componentDefaultProps.swaninterface);
        this.dependenciesPool = {
            san,
            communicator,
            ...this.componentDefaultProps
        };
    }

    /**
     * 创建组件的工厂方法
     *
     * @param {Object} componentName - 创建组件的名称
     * @param {Object} componentPrototype - 创建组件的原型
     * @param {Object} properties - 创建组件用的属性
     */
    componentDefine(componentName, componentPrototype, properties = {}) {
        this.componentInfos[componentName] = {
            componentPrototype,
            ...properties
        };
    }

    /**
     * 获取所有的注册过的组件
     *
     * @return {Object} 获取的当前注册过的所有组件
     */
    getAllComponents() {
        return this.getComponents();
    }

    /**
     * 获取所有注册过的组件
     *
     * @param {string|Array} componentName - 需要获取的component的名称
     * @return {Object} 获取的所有的注册的组件
     */
    getComponents(componentName = this.getAllComponentsName()) {

        const componentNames = [].concat(componentName);

        const components = componentNames.reduce((componentSet, componentName) => {
            componentSet[componentName] = this.createComponents(componentName);
            return componentSet;
        }, {});

        return typeof componentName === 'string' ? components[componentName] : components;
    }

    /**
     * 创建一个组件
     *
     * @param {string} componentName - 需要创建的组件的名称
     * @return {class} - 创建的组件
     */
    createComponents(componentName) {

        const componentInfo = this.componentInfos[componentName];
        if (componentInfo && componentInfo.createdClass) {
            return componentInfo.createdClass;
        }

        // 原始的组件的原型
        const originComponentPrototype = componentInfo.componentPrototype;

        // 获取超类名称
        const superComponentName = originComponentPrototype.superComponent || 'swan-component';
        
        // 获取到当前组件的超类
        const superComponent = this.componentInfos[superComponentName].componentPrototype;
        
        // 继承
        const mergedComponentPrototype = this.mergeComponentProtos(
                superComponent,
                componentInfo.componentPrototype
            );

        // 用组件依赖装饰组件原型，生成组件原型
        const componentPrototype = this.decorateComponentPrototype(
                mergedComponentPrototype,
                componentInfo
            );

        // 用merge好的proto来定义san组件(类)并返回
        const sanComponent = this.defineSanComponent(componentPrototype);

        // 返回修饰过的类
        return this.behaviors(componentPrototype.behaviors || [], sanComponent);
    }

    /**
     * 使用装饰器装饰组件原型
     *
     * @param {Object} componentPrototype 组件原型
     * @param {Object} componentInfo 组件原始传入的构造器
     * @return {Object} 装饰后的组件原型
     */
    decorateComponentPrototype(componentPrototype, componentInfo) {

        // 所有的组件的依赖在依赖池寻找后的结果
        const dependencies = (componentPrototype.dependencies || [])
            .reduce((dependencies, depsName) => {
                dependencies[depsName] = this.dependenciesPool[depsName];
                return dependencies;
            }, {});

        // merge后的组件原型，可以用来注册san组件
        return {
            ...componentPrototype,
            ...dependencies,
            ...componentInfo.classProperties
        };
    }

    /**
     * 获取所有组件的名称
     *
     * @return {Array} 所有组件的名称集合
     */
    getAllComponentsName() {
        return Object.keys(this.componentInfos);
    }

    /**
     * 将两个组件的proto给merge为一个
     *
     * @param {Object} targetProto - 被merge的组件proto
     * @param {Object} mergeProto - 待merge入的组件proto
     * @return {Object} merge结果
     */
    mergeComponentProtos = (targetProto, mergeProto) => {
        // merge传入的proto
        return Object.keys(mergeProto)
            .reduce((mergedClassProto, propName) => {
                switch (propName) {
                    case 'constructor':
                    case 'detached':
                    case 'created':
                        mergedClassProto[propName] = function (options) {
                            targetProto[propName] && targetProto[propName].call(this, options);
                            mergeProto[propName] && mergeProto[propName].call(this, options);
                        };
                        break;

                    case 'computed':
                        mergedClassProto['computed'] = Object.assign(
                                {},
                                mergedClassProto[propName],
                                mergeProto[propName]
                            );
                        break;

                    case 'dependencies':
                        mergedClassProto[propName] = (mergeProto[propName] || [])
                            .reduce((r, v, k) => {
                                r.indexOf(v) < 0 && r.push(v);
                                return r;
                            }, (mergedClassProto[propName] || []));
                        break;

                    default:
                        mergedClassProto[propName] = mergeProto[propName];
                }
                return mergedClassProto;
            }, {...targetProto});
    }

    /**
     * 传入proto，定义san组件(官网标准的定义san组件方法)
     *
     * @param {Object} proto 组件类的方法表
     * @return {Function} san组件类
     */
    defineSanComponent(proto) {

        function Component(options) {
            san.Component.call(this, options);
            proto.constructor && proto.constructor.call(this, options);
        }

        san.inherits(Component, san.Component);

        Object.keys(proto)
            .forEach(propName => {
                if (propName !== 'constructor') {
                    Component.prototype[propName] = proto[propName];
                }
            });

        return Component;
    }

    /**
     * 获取注册的组件的proto
     *
     * @param {string} componentName - 需要获取的proto的组件的名称
     * @return {Object} - 获取到的组件proto的集合
     */
    getProtos(componentName) {
        return this.componentInfos[componentName]
            && this.componentInfos[componentName].componentPrototype;
    }
}

/**
 * 获取component的生产工厂
 *
 * @param {Object} componentDefaultProps - 默认的组件的属性
 * @param {Object} componentProtos - 所有组件的原型
 * @param {Object} behaviors - 所有的组件装饰器
 * @return {Object} 初始化后的componentFactory
 */
export const getComponentFactory = (componentDefaultProps, componentProtos, behaviors) => {

    swanEvents('slavePreloadGetComponentFactory');

    const sanFactory = new SanFactory(componentDefaultProps, behaviors, componentProtos);

    swanEvents('slavePreloadDefineComponentsStart');

    Object.keys(componentProtos)
        .forEach(protoName => sanFactory.componentDefine(protoName, componentProtos[protoName]));

    swanEvents('slavePreloadDefineComponentsEnd');

    return sanFactory;
};
