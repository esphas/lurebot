import { Lurebot } from './lurebot';
import { DebugAdapter } from './adapters/debug';
import { expect } from 'chai';

describe('Lurebot', function () {
  let lurebot: Lurebot;
  let adapter: DebugAdapter;

  beforeEach(function () {
    lurebot = new Lurebot();
    adapter = new DebugAdapter();
    adapter.write('First Message');
    adapter.write('Second Message');
  });

  afterEach(function () {
    lurebot.stop();
  })

  it('should handle messages', async function () {
    this.timeout(1000);
    await lurebot.plug(adapter, 'debug1');
    lurebot.use((reporter, identity, next) => {
      reporter.reply('OK');
    });
    lurebot.start();
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(adapter.output).to.have.members(['OK', 'OK']);
        lurebot.unplug('debug1');
        resolve();
      }, 100);
    });
  });

  it('should be able to hear', async function () {
    this.timeout(3000);
    await lurebot.plug(adapter, 'debug2');
    let replyAfter = (ms: number) => {
      return (reporter, identity) => {
        setTimeout(() => {
          reporter.reply(String(ms));
        }, ms);
      };
    };
    lurebot.hears(
      /fi/i,
      replyAfter(1000),
      replyAfter(400),
      replyAfter(2000)
    );
    lurebot.start();
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(adapter.output).to.have.ordered.members(['400', '1000', '2000']);
        lurebot.unplug('debug2');
        resolve();
      }, 2100);
    });
  });
});
