/**
 * @file swan组件的模板
 * @author yangyang55(yangyang55@baidu.com)
 */
window.define('<%-customComponentPath%>', function (require, modulesExports) {
    let componentUsingComponentMap = JSON.parse(`#componentUsingComponentMap#`);
    function processTemplateModule(filterTemplateArrs, filterModule) {
        eval(filterModule);
        let modules = {};
        let templateFiltersObj = {};
        filterTemplateArrs && filterTemplateArrs.forEach(element => {
            let {
                filterName,
                func,
                module
            } = element;
            modules[module] = eval(module);
            templateFiltersObj[filterName] = (...args) => modules[module][func](...args);
        });
        return templateFiltersObj;
    }
    // template创建
    let createTemplateComponent = function(components) {
        let templateComponents = Object.create(null);
        let customComponents = Object.create(null);
        "#swanCustomComponentTemplates#";
        // 传入 template 的组件包括该自定义组件使用的自定义组件和模板
        Object.assign(customComponents, components, templateComponents);
        return templateComponents;
    }
    // filter 模块名以及对应的方法名集合
    let filterCustomArr = JSON.parse('<%-filters%>');
    // 闭包封装filter模块
    <%-modules-%>

    let modules = {};
    let filtersObj = {};
    filterCustomArr && filterCustomArr.forEach(element => {
        modules[element.module] = eval(element.module);
        let func = element.func;
        let module = element.module;
        filtersObj[element.filterName] = (...args) => {
            return modules[module][func](...args);
        };
    });
    modulesExports.exports = {
        componentUsingComponentMap: componentUsingComponentMap,
        template: `<%-customComponentTemplate%>`,
        isComponent: "#isComponent#",
        size: "#size#",
        componentPath: '<%-customComponentPath%>',
        customComponentCss: <%-customComponentCssArray%>,
        createTemplateComponent: createTemplateComponent,
        filters: Object.assign({}, filtersObj),
        initialFilters: filterCustomArr,
        pageModules: modules
    };
})