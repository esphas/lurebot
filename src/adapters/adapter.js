'use strict';

class Adapter {

  async install(lurebot, ker) {
    throw new Error('说好的做彼此的天使呢？');
  }

  async uninstall(lurebot, ker) {
    console.info(`Lurebot 💔 ${ker}`);
  }

  start() {
    throw new Error('城上斜阳画角哀，沈园非复旧池台。伤心桥下春波绿，曾是惊鸿照影来。');
  }

  stop() {
    throw new Error('自是寻春去校迟，不须惆怅怨芳时。狂风落尽深红色，绿叶成阴子满枝。');
  }

  /**
   * wind: String | RegExp
   * rain: (reporter, identity, matched) => {}
   *   reporter: {
   *     reply: Function
   *   }
   *   identity: {
   *     jo: String,
   *     yce: String
   *   }
   *   matched: Array
   */
  hears(wind, ...rain) {
    throw new Error('你们啊，不要听🌬就是🌧！你们本身也要有判断的嘛！');
  }
}

module.exports = Adapter;
