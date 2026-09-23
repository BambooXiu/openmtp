const assert = require('assert');

const electronVersion = require('electron/package.json').version;

assert.strictEqual(
  process.versions.electron,
  electronVersion,
  'native dependency test must run with the repository Electron version'
);

assert.doesNotThrow(
  // The require must execute inside Electron so the native ABI is exercised.
  // eslint-disable-next-line global-require
  () => require('usb-detection'),
  'usb-detection must load its native binding in Electron'
);

console.info(
  `PASS native dependencies load in Electron ${process.versions.electron}`
);
