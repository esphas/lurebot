Lurebot
===

还没想好怎么写 readme，总之先学习一下西方的这一套理论

Basic Usage
---
```javascript
const Lurebot = require('lurebot');
const lurebot = new Lurebot;
// create a telegraf adapter (it uses telegraf to communicate with telegram server)
const adapter = new Lurebot.Adapter.Telegraf('<telegram bot token>');
// install the adapter
lurebot.plug(adapter);

// responses to all sources
lurebot.hears(/^Hello Robot!/, function (hkreporter) {
  hkreporter.reply('Hello!');
});

// responses to recognized sources only
lurebot.hears(/^-uid/i, function (hk, identity) {
  if (!identity.anonymous) {
    hk.reply('Hello, ' + identity.name + ', your UID is ' + identity.uid + '.');
  }
});

// responses to unrecognized private sources only
lurebot.hears(/./, function (hk, id) {
  if (id.anonymous && hk.private) {
    hk.reply('I don\'t know you.');
  }
});

// response to recognized group sources only
lurebot.hears(/^-ukpostcode\s*([\w\d]{4}\s?[\w\d]{3})/, async function (hk, id) {
  if (!hk.private && !id.anonymous) {
    hk.reply('Wait a minute, I need some time...');
    let info = await hk.fetch('https://postcodes.io/postcodes/' + hk.match[1]);
    info = info.json();
    if (info.status == '200') {
      hk.reply('...it should be ' + info.admin_ward);
    } else {
      hk.reply('...sorry but I doubt if that postcode really exists');
    }
  }
});

// sessions
lurebot.session(function (session) {
  // restrictions (can be ignored)
  session.restrict(function (hk, id) {
    return !id.anonymous;
  });
  // expires after being inactive for ?? (seconds)
  // default to 60
  session.expires(30);
  // start session (required)
  session.start(/^-startguess/, function (hk, id) {
    hk.reply(id.name + ' started guessing number!');
    // set state to 'alive'
    session.state('alive');
    // set custom variables
    session.set('rv', Math.floor(Math.random()*100) + 1);
    session.set('chance', 5);
  });
  // triggers only in state 'alive'
  session.hears('alive', /^-guess\s*(\d+)/, function (hk) {
    let guess = parseInt(hk.match[1], 10);
    let rv = session.get('rv');
    if (guess < rv) {
      hk.reply('lesser!');
      session.set('chance', session.get('chance') - 1);
    } else if (guess > rv) {
      hk.reply('greater!');
      session.set('chance', session.get('chance') - 1);
    } else {
      hk.reply('congratulations!');
      session.end(); // end session
    }
    if (session.get('chance') < 0) {
      hk.reply('you have run out of chance!');
      session.end(); // end session
    }
  });
});
```

---

Rain: Onetime Handling
---

Storm, aka Session
---


---

Structure
---
```
+- Lurebot ----------------+
| +- Processor --------+  =|
| |   head processor <-|--=|
| | (processing chain) |  =|-+
| |    (middleware)    |   | | +- Adapter(s) ---+
| +--------------------+   | +-|->              |
|                          |   |                |
| +- Server -----------+   | +-|->              |
| | listening messages |   | | +----------------+
| |      UDP/LMTP      |  =|-+
| |  trigger adapter <-|--=|
| +--------------------+  =|
+--------------------------+
```

LMTP: Lurebot Message Transfer Protocol
---
```
Packet  :: Size + Key + Message
Size    :: UInt8
Key     :: UTF8Char[Size]
Message :: UTF8Char[] # All remaining
```

note to self
---
\n\r, \n
gb18030, utf8
