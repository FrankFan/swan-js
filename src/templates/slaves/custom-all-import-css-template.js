/**
 * @file 自定义组件中所有被 import 的 css
 * @author yangyang55(yangyang55@baidu.com)
 */
(function (global) {
    var componentFactory = global.componentFactory;
    componentFactory.allCustomComponentsImportCss = #allCustomComponentsImportCssMap#;
    // 新编译产出兼容旧core使用
    if (typeof componentFactory.translateAllCustomImportCss !== 'function') {
        var addStylesheetRulesForComponent = function (cssrules, prefix) {
            var element = document.querySelector('link[linkname=app]');
            var rulePrefixReg = new RegExp('.' + prefix + '__' + prefix + '__', 'g');
            cssrules = cssrules.replace(rulePrefixReg, '.' + prefix + '__');
            if (cssrules && element) {
                var stylesheet = element.sheet;
                var len = stylesheet.cssRules ? stylesheet.cssRules.length : 0;
                stylesheet.insertRule(cssrules, len);
            }
        }
        componentFactory.translateAllCustomImportCss = function (customComponentCss, prefix) {
            var tranlatededCss = Object.create(null);
            var doTranslateAllCustomImportCss = function (componentCss) {
                if (componentCss.length === 0) {
                    return '';
                }
                var result = '';
                // 分四种情况：正常 css,'swan-'前缀，'xx__'前缀,import 引用的 css，[2]一组 rules结束
                componentCss.forEach(function (cssItem) {
                    if (Array.isArray(cssItem)) {
                        var item = cssItem[0];
                        if (item === 0) {
                            result += (prefix + '__');
                        } else if (item === 1) {
                            result += ('swan-' + prefix + ' ');
                        } else if (item === 2) {
                            addStylesheetRulesForComponent(result, prefix);
                            result = '';
                        }
                    } else if (typeof cssItem === 'string') {
                        result += cssItem;
                    } else if (cssItem.constructor === Object) {
                        var customAbsolutePath = cssItem.path;
                        if (!tranlatededCss[customAbsolutePath]) {
                            tranlatededCss[customAbsolutePath] = true;
                            doTranslateAllCustomImportCss(
                                componentFactory.allCustomComponentsImportCss[customAbsolutePath] || []);
                        }
    
                    }
                });
            };
            doTranslateAllCustomImportCss(customComponentCss);
        };
    }
}(window));
