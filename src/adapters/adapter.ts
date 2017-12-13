
export abstract class Adapter {

  // 说好的做彼此的天使呢？
  abstract async install(inst: Installer): Promise<Status>;

  // 💔
  abstract async uninstall(uninst: Uninstaller): Promise<Status>;

  // 城上斜阳画角哀，沈园非复旧池台。伤心桥下春波绿，曾是惊鸿照影来。
  abstract start(): Status;

  // 自是寻春去校迟，不须惆怅怨芳时。狂风落尽深红色，绿叶成阴子满枝。
  abstract stop(): Status;

  // 你们啊，不要听🌬就是🌧！你们本身也要有判断的嘛！
  abstract hears(wind: Wind, ...rain: Drop[]): Status;
}
