if (typeof global.setImmediate !== "function") {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(() => callback(...args), 0);
  };
}

if (typeof global.clearImmediate !== "function") {
  global.clearImmediate = (handle) => {
    clearTimeout(handle);
  };
}

const { registerRootComponent } = require("expo");
const App = require("./App").default;

registerRootComponent(App);
