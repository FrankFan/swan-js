/**
 * @file insertRuleForLink
 * @author yangyang55(yangyang55@baidu.com)
 */

/**
 * 通过insertRule方式向 link 中插入 css
 *
 * @param {string} cssrules 待插入的 cssrule
 * @param {Object} attrObj  要插入的 link 的选择器 {key:x,value:x}的形式
 */
export const insertRuleForLink = (cssrules, attrObj = {}) => {
    let element = document.querySelector(`link[${attrObj.key}=${attrObj.value}]`);
    if (cssrules && element) {
        let stylesheet = element.sheet;
        let len = stylesheet.cssRules ? stylesheet.cssRules.length : 0;
        stylesheet.insertRule(cssrules, len);
    }
};