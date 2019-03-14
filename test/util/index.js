window.getInstance = function(wvId) {
    return window.masterManager.navigator.history.seek(wvId).userPageInstance;
}
window.getHistoryStack = function() {
    return window.masterManager.navigator.history.historyStack;
}