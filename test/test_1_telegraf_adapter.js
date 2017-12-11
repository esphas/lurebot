'use strict';

const {expect} = require('chai');
const HttpsProxyAgent = require('https-proxy-agent');

const Lurebot = require('../src/main');
const TelegrafAdapter = require('../src/adapters/telegraf');

describe('TelegrafAdapter', function () {
  let lurebot = new Lurebot();

  before(async function () {
    this.timeout(10000);
    let tg_auth = require('./private/tg-auth.json');
    let tg = new TelegrafAdapter(
      tg_auth.token,
      {
        telegram: {
          agent: new HttpsProxyAgent(tg_auth.proxy)
        }
      }
    );
    await lurebot.use('telegraf', tg);
    let cqp = new CQPAdapter();
    await lurebot.use('cqp', cqp);
  });

  describe('#hears', function () {
    it('should have ears', function () {
      expect(lurebot).to.respondTo('hears');
    });

    it('should not be deaf', function (done) {
      this.timeout(6000);
      let urdonefor = false;
      lurebot.hears(/./, async (reporter, identity, matched) => {
        await reporter.reply('done');
        if (!urdonefor) {
          urdonefor = true;
          console.log(matched);
          done();
        }
      });
      lurebot.start();
    });

    afterEach(function () {
      lurebot.stop();
    });
  });
});
