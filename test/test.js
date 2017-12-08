'use strict';

const fs = require('fs');

const {expect} = require('chai');
const HttpsProxyAgent = require('https-proxy-agent');

const Lurebot = require('../src/main');
const TelegrafAdapter = require('../src/adapters/telegraf');

describe('Lurebot', function () {
  let lurebot = new Lurebot();

  before(async function () {
    this.slow(2000);
    let tg_auth = JSON.parse(fs.readFileSync('./test/private/tg-auth.json'));
    let tg = new TelegrafAdapter(
      tg_auth.token,
      {
        telegram: {
          agent: new HttpsProxyAgent(tg_auth.proxy)
        }
      }
    );
    await lurebot.use('telegraf', tg);
  });

  describe('#hears', function () {
    it('should have ears', function () {
      expect(lurebot).to.respondTo('hears');
    });

    it('should not be deaf', function (done) {
      this.timeout(3000);
      let urdonefor = false;
      lurebot.hears(/./, (reporter, identity, matched) => {
        reporter.reply('done');
        if (!urdonefor) {
          urdonefor = true;
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
