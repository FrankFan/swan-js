/**
 * @file swan's newslave '.swan' for old swancore.
 * @author yangyang55(yangyang55@baidu.com)
 */

(function () {
    var swanVersion = window.swanVersion || 0;
    window.errorMsg = window.errorMsg || [];
    function supportRequire() {
        if (!window.require || !window.define) {
            var MODULE_PRE_DEFINED = 1;
            var MODULE_DEFINED = 2;
            var modModules = {};
            window.require = function (id) {
                if (typeof id !== 'string') {
                    throw new Error('require args must be a string');
                }
                var mod = modModules[id];
                if (!mod) {
                    throw new Error('module "' + id + '" is not defined');
                }
                if (mod.status === MODULE_PRE_DEFINED) {
                    var factory = mod.factory;

                    var localModule = {
                        exports: {}
                    };
                    var factoryReturn = factory(
                        require,
                        localModule,
                        localModule.exports,
                        define
                    );
                    mod.exports = localModule.exports || factoryReturn;
                    mod.status = MODULE_DEFINED;
                }
                return mod.exports;
            };
            window.define = function (id, dependents, factory) {
                if (typeof id !== 'string') {
                    throw new Error('define args 0 must be a string');
                }
                var deps = dependents instanceof Array ? dependents : [];
                var realFactory = typeof dependents === 'function' ? dependents : factory;

                // 本地缓存中已经存在
                if (modModules[id]) {
                    return;
                }

                modModules[id] = {
                    status: MODULE_PRE_DEFINED,
                    dependents: deps,
                    factory: realFactory
                };
            };
        }
    }
    supportRequire();
    function compareVersion(v1, v2) {
        v1 = v1.split('.');
        v2 = v2.split('.');
        var len = Math.max(v1.length, v2.length);
        while (v1.length < len) {
            v1.push('0');
        }
        while (v2.length < len) {
            v2.push('0');
        }
        for (var i = 0; i < len; i++) {
            var num1 = parseInt(v1[i], 10);
            var num2 = parseInt(v2[i], 10);
            if (num1 > num2) {
                return 1;
            } else if (num1 < num2) {
                return -1;
            }
        }
        return 0;
    }
    // 最后一个不支持新编译的版本
    var lastNoSupportVersion = '3.30.0';
    if (compareVersion(lastNoSupportVersion, swanVersion) >= 0) {
        var loadRuntimeJs = new Promise(function (resolve, reject) {
            var appPath = window.pageInfo.appPath;
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = appPath + '/swan-execute.js';
            script.onload = function () {
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
        loadRuntimeJs.then(function () {
            if (typeof window.renderPage === 'function') {
                window.renderPage('<%-customComponentPath%>');
            }
        }).catch(function (e) {
            window.errorMsg['execError'] = e;
        });
    }
})();