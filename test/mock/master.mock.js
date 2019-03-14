import Master from '../../src/master/index.js';
var swanGlobal = undefined
window.master = new Master(window, window.swanInterface, window.swanComponents);
// new Master(window, swanInterface, swanComponents);