export interface KeyHook {
  startHook: () => boolean;
  stopHook: () => boolean;
}

try {
  const addon = require('./keyHook.node');
  module.exports = addon as KeyHook;
} catch (err) {
  console.error('Failed to load keyHook native module:', err);
  module.exports = {
    startHook: () => false,
    stopHook: () => false,
  } as KeyHook;
}
