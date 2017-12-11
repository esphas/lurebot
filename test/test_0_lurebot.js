'use strict';

const {expect} = require('chai');

const Lurebot = require('../src/main');
const DebugAdapter = require('../src/adapters/debug');

describe('Lurebot', function () {
  let lurebot = new Lurebot();

  it('should have some adapters', function () {
    expect(lurebot.adapters).to.be.an('array');
  });

  it('can use an Adapter', function () {
    expect(lurebot).to.respondTo('use');
    let debug = new DebugAdapter();
    lurebot.use('dubug', debug);
    expect(lurebot.adapters).to.have.members('debug');
  });
});
