import { Lurebot } from './lurebot';
import { DebugAdapter } from './adapters/debug';
import { expect } from 'chai';

describe('Lurebot', function () {
  let lurebot: Lurebot;
  let adapter: DebugAdapter;

  beforeEach(function () {
    lurebot = new Lurebot();
    adapter = new DebugAdapter();
    let identity = {
      uid: 0,
      name: 'ghost',
      addresses: ['debug'],
      anonymous: false
    }, position = {
      pid: 0,
      private: false
    };
    adapter.write({
      message: 'First Message',
      identity,
      position
    });
    adapter.write({
      message: 'Second Message',
      identity,
      position
    });
  });

  it('should handle messages', async function () {
    await lurebot.plug(adapter, 'debug1');
    lurebot.use((reporter, identity, next) => {
      reporter.reply('OK');
      next();
    });
    // this is an exclusive function for DebugAdapter
    adapter.onAllProcessed(() => {
      expect(adapter.output).to.have.members(['OK', 'OK']);
      lurebot.stop();
    });
    await lurebot.start();
    await lurebot.unplug('debug1');
  });

  it('should be able to hear', async function () {
    await lurebot.plug(adapter, 'debug2');
    let replyAfter = (ms: number) => {
      return async (reporter, identity) => {
        await new Promise((resolve) => {
          setTimeout(() => {
            reporter.reply(String(ms));
            resolve();
          }, ms);
        });
      };
    };
    lurebot.hears(
      /fi/i,
      replyAfter(1000),
      replyAfter(400),
      replyAfter(1500)
    );
    adapter.onAllProcessed(() => {
      expect(adapter.output).to.have.ordered.members(['400', '1000', '1500']);
      lurebot.stop();
    });
    await lurebot.start();
    await lurebot.unplug('debug2');
  });
});
