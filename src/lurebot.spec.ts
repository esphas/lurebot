import { Lurebot } from './lurebot';
import { DebugAdapter } from './adapters/debug';
import { expect } from 'chai';

describe.skip('Lurebot', function () {
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
    lurebot.plug(adapter, 'debug1');
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
    lurebot.unplug('debug1');
  });

  it('should be able to hear', async function () {
    lurebot.plug(adapter, 'debug2');
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
    lurebot.unplug('debug2');
  });
});

describe('Practical Lurebot', function () {
  let lurebot: Lurebot;
  let adapter: DebugAdapter;

  beforeEach(function () {
    lurebot = new Lurebot;
    adapter = new DebugAdapter;
    let input = {
      message: 'Hello Robot!',
      identity: {
        uid: 0,
        name: 'Ghost',
        addresses: ['debug'],
        anonymous: false
      },
      position: {
        pid: 0,
        private: false
      }
    };
    adapter.write(JSON.parse(JSON.stringify(input)));
    input.message = '-uid';
    adapter.write(JSON.parse(JSON.stringify(input)));
    input.identity.anonymous = true;
    adapter.write(JSON.parse(JSON.stringify(input)));
    input.position.private = true;
    adapter.write(JSON.parse(JSON.stringify(input)));
    input.identity.anonymous = false;
    input.position.private = false;
    input.message = '-ukpostcode AA'
    adapter.write(JSON.parse(JSON.stringify(input)));
    input.message = '-ukpostcode OX49 5NU'
    adapter.write(JSON.parse(JSON.stringify(input)));
    lurebot.plug(adapter, 'debug');
    lurebot.hears(/^Hello Robot!/, function (hkreporter) {
      hkreporter.reply('Hello!');
    });
    lurebot.hears(/^-uid/i, function (hk, identity) {
      if (!identity.anonymous) {
        hk.reply('Hello, ' + identity.name + ', your UID is ' + identity.uid + '.');
      }
    });
    lurebot.hears(/./, function (hk, id) {
      if (id.anonymous && hk.private) {
        hk.reply('I don\'t know you.');
      }
    });
    lurebot.hears(/^-ukpostcode\s*([\w\d]{4}\s?[\w\d]{3})/, async function (hk, id) {
      if (!hk.private && !id.anonymous) {
        hk.reply('Wait a minute, I need some time...');
        let info = await hk.fetch('https://postcodes.io/postcodes/' + hk.matched[1]);
        let jinfo: any = info.json();
        if (jinfo.status == '200') {
          hk.reply('...it should be ' + jinfo.admin_ward);
        } else {
          hk.reply('...sorry but I doubt if that postcode really exists');
        }
      }
    });
  });

  it('prcatices!', async function () {
    adapter.onAllProcessed(() => {
      //expect(adapter.output).to.have.members(['OK', 'OK']);
      console.log(adapter.output);
      lurebot.stop();
    });
    await lurebot.start();
  });
})
