'use strict';

const Adapter = require('./adapter');

module.exports = class DebugAdapter extends Adapter {

  constructor() {
    super();
    console.log('Adapter Constructor Called');
  }

  async install(lurebot, ker) {
    console.log(`Adapter ${ker} install() callled, lurebot adapters:`);
    console.dir(lurebot.adapters);
  }

  async uninstall(lurebot, ker) {
    //
  }

  start() {
    //
  }

  stop() {
    //
  }

  hears(wind, rain) {
    //
  }
};
