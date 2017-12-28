import Lurebot = require('./main');
import { DebugAdapter } from './adapters/debug';
import { expect } from 'chai';

describe('Lurebot', function () {
  let lurebot = new Lurebot();
  let adapter = new DebugAdapter();
  before(function () {
    adapter.write('First Message');
    adapter.write('Second Message');
    lurebot.plug(adapter, 'debug');
  });

  it('should handle messages', function (done) {
    lurebot.start();
    setTimeout(() => {
      expect(adapter.output).to.have.ordered.members(['First Message', 'Second Message']);
      done();
    }, 1000);
  });
});
