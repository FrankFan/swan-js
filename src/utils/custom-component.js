/**
 * @file 自定义组件相关工具方法
 * @author lvlei(lvlei03@baidu.com)
 */

// 自定义组件中的properites类型默认值映射
const propDefaultValMap = {
    String: '',
    Number: 0,
    Boolean: false,
    Object: null,
    Array: [],
    null: null
};

/**
 * 根据properites中的property类型获取该类行默认的值
 *
 * @param {*} propertyType - type类型
 * @return {*} property默认值
 */
const getDefaultVal = propertyType => {
    return Object.keys(propDefaultValMap)
        .filter(type => new RegExp(type).test(propertyType + ''))
        .map(type => propDefaultValMap[type])[0];
};

/**
 * 对自定义组件properites进行处理, 包括根据类型进行初始化数据
 *
 * @param {*} propertyVal - 该property的value, 可能是一个obj, 也可能是一个直接数据类型
 * @return {*} 处理之后的值
 */
export const getPropertyVal = propertyVal => {
    return Object.prototype.toString.call(propertyVal) === '[object Object]'
        ? propertyVal.value || getDefaultVal(propertyVal.type)
        : getDefaultVal(propertyVal);
};

/**
 * 自定义组件的使用统计
 *
 * @param {Object} swaninterface - 端能力对象
 * @param {Object} pagesQueue - 所有页面信息
 */
export const customComponentStatistics = (swaninterface, pagesQueue) => {
    try {
        const appInfo = swaninterface.boxjs.data.get({name: 'swan-appInfoSync'});
        const systemInfo = swaninterface.boxjs.device.systemInfo({type: 'sync'});

        // 小程序页面数量
        const allPagesNum = Object.keys(pagesQueue).length;

        // 将原始map备份并改造成使用过自定义组件的pagesQueue
        const usedCustomComponentPages = Object.keys(pagesQueue)
            .reduce((pages, item) => {
                if (pagesQueue[item].usingComponents.length) {
                    pages[item] = pagesQueue[item];
                }
                return pages;
            }, {});

        // 使用过自定义组件的页面数量
        const usedCustomComponentPagesNum = Object.keys(usedCustomComponentPages).length;

        // 使用过自定义组件的页面, 其使用到的自定义组件数量
        const list = Object.keys(usedCustomComponentPages)
            .map(path => ({
                    path,
                    num: usedCustomComponentPages[path].usingComponents.length
                })
            );

        // 上传数据
        swaninterface.boxjs.log({
            name: 'ubcReport',
            data: {
                actionId: 875,
                value: {
                    from: 'swan',
                    ext: {
                        appkey: appInfo.appid,
                        appVersion: systemInfo.SDKVersion,
                        allPagesNum,
                        usedCustomComponentPagesNum,
                        list
                    }
                }
            }
        });
    } catch (err) {
        console.error(`customComponentStatistics error: ${err}`);
    }
};