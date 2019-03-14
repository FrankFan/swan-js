/**
 * @file swan's newslave '.swan' for old swancore,used for compilation.
 * @author yangyang55(yangyang55@baidu.com)
 */

window.renderPage = function (customComponentPath) {
    function loaderJs(loadPath) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = loadPath;
            script.onload = function () {
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    function loadCss(loadPath) {
        return new Promise(function (resolve, reject) {
            var doc = document;
            var link = doc.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = loadPath;
            link.setAttribute('linkname', 'app');
            link.onload = function () {
                resolve();
            };
            link.onerror = reject;
            doc.head.appendChild(link);
        });
    }

    var pageContentInfo = window.require(customComponentPath);
    var componentFactory = window.componentFactory;
    var componentFragments = componentFactory.getAllComponents();
    // 当前页面使用的自定义组件
    var componentUsingComponentMap = pageContentInfo.componentUsingComponentMap;
    var isComponent = pageContentInfo.isComponent;
    var pageContent = pageContentInfo.template;
    if (isComponent) {
        pageContent = '<custom-component></custom-component>';
        componentUsingComponentMap = {};
        componentUsingComponentMap[pageContentInfo.componentPath] = ['custom-component'];
    }
    var initialFilters = pageContentInfo.initialFilters;
    var modules = pageContentInfo.pageModules;

    // 当前页面的自定义组件是否包含了自定义组件
    var pageComponentUsingCustomComponent = !!Object.keys(componentUsingComponentMap).length;

    Promise.resolve().then(function () {
        // 未使用自定义组件
        if (!pageComponentUsingCustomComponent) {
            return {
                customComponents: {},
                pageTemplateComponents: pageContentInfo.createTemplateComponent(componentFragments)
            };
        }
        // 加载自定义组件
        var appPath = window.pageInfo.appPath;
        var templateComponents = Object.create(null);
        var comstomUsingCompoentMap = Object.create(null);
        var niqueIndex = 0;
        var customComponentsSizeInfo = {};

        // 创建自定义组件
        var getComponentEvent = function (componentUsingComponentMap) {
            var allComponents = Object.create(null);
            Object.keys(componentUsingComponentMap).forEach(function (customAbsolutePath) {
                var customNamesArr = componentUsingComponentMap[customAbsolutePath];
                // 加载依赖的组件
                var customComponentObj = window.require(customAbsolutePath);
                if (!customComponentsSizeInfo[customAbsolutePath]) {
                    customComponentsSizeInfo[customAbsolutePath] = customComponentObj['size'] || 0;
                }
                // 深度遍历加载创建-同步构建
                if (Object.keys(customComponentObj.componentUsingComponentMap).length) {
                    if (!comstomUsingCompoentMap[customAbsolutePath]) {
                        comstomUsingCompoentMap[customAbsolutePath] = {};
                        var components = getComponentEvent(customComponentObj.componentUsingComponentMap);
                        Object.assign(comstomUsingCompoentMap[customAbsolutePath], components);
                    }
                } else {
                    comstomUsingCompoentMap[customAbsolutePath] = {};
                }
                // 创建自定义组件的template，传入该自定义组件使用的组件
                var customTemplateComponents = customComponentObj.createTemplateComponent(
                    Object.assign(componentFragments, comstomUsingCompoentMap[customAbsolutePath]));
                customNamesArr.forEach(function (prefix) {
                    var swanPrefix = 'swan-' + prefix;
                    var i = niqueIndex++;
                    componentFactory.translateAllCustomImportCss(customComponentObj.customComponentCss, prefix);
                    // 避免组件名重复造成覆盖问题
                    var componentUniqueName = 'components/' + prefix + '/' + prefix + i;
                    componentFactory.componentDefine(componentUniqueName, Object.assign({},
                        componentFactory.getProtos('super-custom-component'),
                        {
                            // superComponent: 'super-custom-component',
                            template: '<' + swanPrefix + '>'
                                + customComponentObj.template + '</' + swanPrefix + '>',
                            componentPath: customComponentObj.componentPath,
                            componentName: prefix,
                            customComponentCss: ''
                        }
                    ), {
                            classProperties: {
                                components: Object.assign(comstomUsingCompoentMap[customAbsolutePath],
                                    componentFragments, customTemplateComponents),
                                filters: Object.assign({}, customComponentObj.filters)
                            }
                        }
                    );
                    allComponents[prefix] = componentFactory.getComponents(componentUniqueName);
                });
            });
            return allComponents;
        };
        return Promise.all([
            loadCss(appPath + '/app.css'),
            loaderJs(appPath + '/allImportedCssContent.js'),
            loaderJs(appPath + '/allCusomComponents.swan.js')
        ]).then(function () {
            var customComponents = getComponentEvent(componentUsingComponentMap);
            var allCustomComponentsNum = 0;
            var allCustomComponentsSize
            = Object.keys(customComponentsSizeInfo).reduce(function (total, customAbsolutePath) {
                total += parseInt(customComponentsSizeInfo[customAbsolutePath], 10);
                allCustomComponentsNum += 1;
                return total;
            }, 0);
            // 给页面template使用的组件赋值
            Object.assign(templateComponents, componentFragments, customComponents);
            var pageTemplateComponents = pageContentInfo.createTemplateComponent(templateComponents);
            return {
                pageTemplateComponents: pageTemplateComponents,
                customComponents: customComponents,
                customComponentsSizeInfo: {
                    allCustomComponentsSize: allCustomComponentsSize,
                    allCustomComponentsNum: allCustomComponentsNum
                }
            };
        });
    }).then(function (pageInfo) {
        window.pageRender(pageContent, pageInfo.pageTemplateComponents,
            pageInfo.customComponents, initialFilters, modules, 'newTemplate', pageInfo.customComponentsSizeInfo);
    }).catch(function (e) {
        window.errorMsg['execError'] = e;
        throw e;
    });
};
