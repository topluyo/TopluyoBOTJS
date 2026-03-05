# topluyo-bot

[![npm](https://img.shields.io/npm/v/topluyo-bot?logo=npm)](https://www.npmjs.com/package/topluyo-bot)
[![npm (scoped)](https://img.shields.io/npm/v/%40topluyo%2Ftopluyo-bot?label=%40topluyo%2Ftopluyo-bot&logo=npm)](https://www.npmjs.com/package/@topluyo/topluyo-bot)
[![GitHub](https://img.shields.io/badge/GitHub-TopluyoBOTJS-blue?logo=github)](https://github.com/topluyo/TopluyoBOTJS)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?logo=node.js)](https://nodejs.org)

🌐 **Dil Seçimi / Language Selection:**

[🇹🇷 Türkçe](#-türkçe) · [🇬🇧 English](#-english)

📦 **npm:** `@topluyo/topluyo-bot` · `topluyo-bot`  
📦 **GitHub:** [github.com/topluyo/TopluyoBOTJS](https://github.com/topluyo/TopluyoBOTJS)

---

# 🇹🇷 Türkçe

`topluyo-bot`, Topluyo platformunda bot geliştirmeyi kolaylaştıran resmi Node.js kütüphanesidir. **WebSocket** üzerinden Topluyo sunucusuna bağlanır; gelen mesajları, grup etkinliklerini ve form gönderimlerini dinler. Yanıtları **REST API** aracılığıyla **toplu (batch)** olarak gönderir, böylece rate-limit baskısını en aza indirir.

> ⚠️ **Zorunlu Kural:** Bot hesabının kullanıcı adının (nickname) **başında** veya **sonunda** `bot` kelimesi bulunmak **zorundadır**.  
> Örnekler: `botMuzo`, `MuzoBot`, `bot-yardimci`, `havabot`

---

## Kurulum

```bash
# npm (scoped)
npm install @topluyo/topluyo-bot

# veya
npm install topluyo-bot
```

> **Gereksinim:** Node.js **v18** veya üzeri (yerleşik `fetch` API'si kullanılmaktadır).

---

## Token Alma

Topluyo hesabınızın **"Cihazlarım"** bölümünden bir Bot Token'ı oluşturun.  
Token'ınızı `.token.json` dosyasında saklayabilirsiniz:

```json
"BURAYA_TOKENINIZI_YAZIN"
```

> ⚠️ Token dosyanızı asla paylaşmayın ve `.gitignore`'a eklemeyi unutmayın.

---

## Hızlı Başlangıç

### CommonJS

```js
const TopluyoBOT = require('topluyo-bot');
// veya: require('@topluyo/topluyo-bot')

const TOKEN = require('./.token.json');
const bot = TopluyoBOT(TOKEN);

bot.on('connected', function () {
  console.log('Bağlandı! ✅');
});

bot.on('message', function (message) {
  console.log('Gelen mesaj:', message);

  if (message.action === 'post/add' && message.message === '!test') {
    bot.post('/!api/post/add', {
      channel_id: message.channel_id,
      text: 'Aktifim ⚡'
    }).then(res => console.log('Post gönderildi:', res));
  }
});
```

### ES Modules (ESM)

```js
import TopluyoBOT from 'topluyo-bot';
// veya: import TopluyoBOT from '@topluyo/topluyo-bot'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const TOKEN = require('./.token.json');

const bot = TopluyoBOT(TOKEN);

bot.on('connected', () => console.log('Bağlandı! ✅'));

bot.on('message', (message) => {
  if (message.action === 'post/add' && message.message === '!test') {
    bot.post('/!api/post/add', {
      channel_id: message.channel_id,
      text: 'Aktifim ⚡'
    });
  }
});
```

### TypeScript

```ts
import TopluyoBOT, { BotInstance, BotMessage, PostAddMessage } from 'topluyo-bot';

const bot: BotInstance = TopluyoBOT('TOKENINIZ');

bot.on('message', function (data: BotMessage) {
  if (data.action === 'post/add') {
    // data: PostAddMessage — data.message, data.channel_id, data.user_id
    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `Merhaba, ${data.user_id}!`
    });
  }
  if (data.action === 'post/bumote') {
    // data: PostBumoteMessage — data.message.form, data.post_id, data.user_id
    console.log(data.message.form);
  }
});
```

> 💡 Tüm interface'ler: `BotMessage`, `PostAddMessage`, `PostBumoteMessage`, `MessageSendMessage`, `GroupJoinMessage`, `GroupLeaveMessage`, `GroupKickMessage`

---

## API Referansı

### `TopluyoBOT(token)`

Bot örneği oluşturur, WebSocket bağlantısını kurar ve `BotInstance` döndürür.

| Parametre | Tip      | Açıklama              |
|-----------|----------|-----------------------|
| `token`   | `string` | Topluyo Bot Token'ı   |

**Döndürür:** `BotInstance`

---

### `bot.on(event, callback)`

Bir olaya dinleyici ekler.

| Olay           | Callback İmzası                           | Açıklama                                  |
|----------------|------------------------------------------|-------------------------------------------|
| `'open'`       | `() => void`                             | WebSocket bağlantısı açıldı               |
| `'connected'`  | `() => void`                             | Bot kimlik doğrulaması başarılı           |
| `'close'`      | `() => void`                             | Bağlantı kapandı (otomatik yeniden bağlanır) |
| `'auth_problem'` | `() => void`                           | Token geçersiz; yeniden bağlanılmaz       |
| `'message'`    | `(data: BotMessage) => void`             | Sunucudan mesaj/olay geldi (`data.action` ile tür ayrıştırılır) |
| `'error'`      | `(err: Error) => void`                   | WebSocket hatası                          |
| `'*'`          | `(event: string, data: BotMessage \| Error) => void` | Tüm olayları dinler          |

```js
// Tüm olayları loglama
bot.on('*', (event, data) => {
  if (event !== 'message') console.log(event, data);
});
```

---

### `bot.post(api, data)`

Topluyo REST API'sine istek gönderir. İstekler, rate-limit baskısını azaltmak için otomatik olarak **toplu (batch)** işlenir.

| Parametre | Tip      | Açıklama                                     |
|-----------|----------|----------------------------------------------|
| `api`     | `string` | Endpoint yolu (ör. `'/!api/post/add'`)       |
| `data`    | `object` | İstek verisi                                 |

**Döndürür:** `Promise<any>`

```js
bot.post('/!api/post/add', {
  channel_id: message.channel_id,
  text: 'Merhaba!',
  code: ''           // isteğe bağlı: kod bloğu
}).then(res => console.log(res));
```

---

### `bot.connect()`

WebSocket bağlantısını el ile açar. `TopluyoBOT()` çağrıldığında otomatik olarak tetiklenir; normalde doğrudan çağrılmasına gerek yoktur.

---

### `bot.ws`

Ham `WebSocket` nesnesi. İleriye dönük özel ihtiyaçlar için erişilebilir.

---

## Olay Verisi – `message`

`message` olayında gelen nesneler `data.action` alanına göre ayrışır. TypeScript kullanıcıları için her tür ayrı bir interface olarak tanımlanmıştır.

---

### `post/add` — Yeni Post

**TypeScript:** `PostAddMessage`

| Alan         | Tip      | Açıklama                              |
|--------------|----------|---------------------------------------|
| `action`     | `'post/add'` | Olay türü                         |
| `message`    | `string` | Gönderilen mesaj metni                |
| `channel_id` | `string` | Mesajın geldiği kanalın ID'si         |
| `user_id`    | `number` | Mesajı gönderen kullanıcının ID'si    |

```js
bot.on('message', (data) => {
  if (data.action === 'post/add') {
    console.log(data.message);    // gönderilen metin
    console.log(data.channel_id); // kanalın ID'si
    console.log(data.user_id);    // gönderen kullanıcının ID'si

    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `Yazdığın: ${data.message}`
    });
  }
});
```

---

### `post/mention` — Mention

**TypeScript:** `PostMentionMessage`

| Alan         | Tip      | Açıklama                               |
|--------------|----------|----------------------------------------|
| `action`     | `'post/mention'` | Olay türü                       |
| `message`    | `string` | Mention içeren post metni              |
| `channel_id` | `string` | Mention'ın gerçekleştiği kanalın ID'si  |
| `user_id`    | `number` | Botu mention eden kullanıcının ID'si  |

```js
bot.on('message', (data) => {
  if (data.action === 'post/mention') {
    console.log(data.message);    // mention içeren metin
    console.log(data.channel_id); // kanalın ID'si
    console.log(data.user_id);    // mention eden kullanıcı ID'si

    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `Merhaba, beni mention ettin! 👋`
    });
  }
});
```

---

### `post/bumote` — Form Gönderimi

**TypeScript:** `PostBumoteMessage`

| Alan                  | Tip      | Açıklama                                          |
|-----------------------|----------|---------------------------------------------------|
| `action`              | `'post/bumote'` | Olay türü                                  |
| `message.form`        | `Record<string, string>` | Form alanları (key → value)     |
| `message.submit`      | `string` | Submit butonunun etiketi                          |
| `post_id`             | `number` | Bumote'un gönderildiği postun ID'si               |
| `user_id`             | `number` | Formu gönderen kullanıcının ID'si                 |

```js
bot.on('message', (data) => {
  if (data.action === 'post/bumote') {
    const form = data.message.form; // { name: 'Hasan', burc: 'Koç', ... }
    console.log(form.name);         // form alanı: name
    console.log(data.post_id);      // postun ID'si
    console.log(data.user_id);      // gönderen kullanıcı ID'si
  }
});
```

---

### `message/send` — Kullanıcı Mesajı

**TypeScript:** `MessageSendMessage`

| Alan      | Tip      | Açıklama                              |
|-----------|----------|---------------------------------------|
| `action`  | `'message/send'` | Olay türü                    |
| `message` | `string` | Gönderilen mesaj metni                |
| `user_id` | `number` | Mesajı gönderen kullanıcının ID'si    |

```js
bot.on('message', (data) => {
  if (data.action === 'message/send') {
    console.log(data.message); // mesaj metni
    console.log(data.user_id); // gönderen kullanıcı ID'si
  }
});
```

---

### Grup Eylemleri

**TypeScript:** `GroupJoinMessage` | `GroupLeaveMessage` | `GroupKickMessage`

| Alan       | Tip      | Açıklama                              |
|------------|----------|---------------------------------------|
| `action`   | `'group/join'` \| `'group/leave'` \| `'group/kick'` | Olay türü |
| `group_id` | `number` | Grubun ID'si                          |
| `user_id`  | `number` | İlgili kullanıcının ID'si             |

```js
bot.on('message', (data) => {
  if (data.action === 'group/join')
    console.log(data.user_id, 'gruba katıldı —', data.group_id);
  if (data.action === 'group/leave')
    console.log(data.user_id, 'gruptan ayrıldı —', data.group_id);
  if (data.action === 'group/kick')
    console.log(data.user_id, 'gruptan atıldı —', data.group_id);
});
```

---

### `turbo/transfer` — Turbo Transferi

**TypeScript:** `TurboTransferMessage`

| Alan                | Tip      | Açıklama                                      |
|---------------------|----------|-----------------------------------------------|
| `action`            | `'turbo/transfer'` | Olay türü                          |
| `message.message`   | `string` | Transfere eklenen not/mesaj                   |
| `message.quantity`  | `number` | Transfer edilen turbo miktarı                 |
| `transfer_id`       | `number` | Transferin ID'si                              |
| `user_id`           | `number` | Transferi gönderen kullanıcının ID'si         |

```js
bot.on('message', (data) => {
  if (data.action === 'turbo/transfer') {
    console.log(data.user_id, 'turbo gönderdi');
    console.log('Miktar:', data.message.quantity); // örn. 0.01
    console.log('Not:', data.message.message);     // örn. 'test'
    console.log('Transfer ID:', data.transfer_id);
  }
});
```

---

## Tam Örnek

```js
const TopluyoBOT = require('topluyo-bot');
const TOKEN = require('./.token.json');

const bot = TopluyoBOT(TOKEN);

// Tüm olayları izle (debug)
bot.on('*', (event, data) => {
  if (event !== 'message') console.log('[Event]', event, data);
});

bot.on('connected', function () {
  console.log('Bot bağlandı ✅');
});

bot.on('auth_problem', function () {
  console.error('Token geçersiz! Panelden yeni token alın.');
});

bot.on('message', function (message) {
  // Post/Add olayları
  if (message.action === 'post/add') {
    if (message.message === '!test') {
      bot.post('/!api/post/add', {
        channel_id: message.channel_id,
        text: 'Aktifim ⚡'
      });
    } else if (message.message === '!saat') {
      bot.post('/!api/post/add', {
        channel_id: message.channel_id,
        text: `🕐 Şu an: ${new Date().toLocaleTimeString('tr-TR')}`
      });
    } else {
      bot.post('/!api/post/add', {
        channel_id: message.channel_id,
        text: `Sen bana \`${message.message}\` mı dedin?`
      });
    }
  }

  // Form gönderimi
  if (message.action === 'post/bumote') {
    const form = message.message.form;
    console.log('Form alındı:', form);
  }

  // Grup olayları
  if (message.action === 'group/join')
    console.log(message.user_id, 'gruba katıldı');
  if (message.action === 'group/leave')
    console.log(message.user_id, 'gruptan ayrıldı');
  if (message.action === 'group/kick')
    console.log(message.user_id, 'gruptan atıldı');
});

bot.on('error', (err) => console.error('Hata:', err));
```

---

## Otomatik Yeniden Bağlanma

Bağlantı kesildiğinde bot **1 saniye** bekleyip otomatik olarak yeniden bağlanır. Bu davranış `auth_problem` olayı alındığında durur (geçersiz token döngüye girmez).

---

## Hata Yönetimi

| Durum             | Açıklama                        | Çözüm                                   |
|-------------------|---------------------------------|-----------------------------------------|
| `auth_problem`    | Token geçersiz veya süresi dolmuş | Panelden yeni token oluşturun         |
| `error` olayı     | WebSocket bağlantı hatası       | Loglayın, bot otomatik yeniden dener    |
| `post` hatası     | API isteği başarısız            | `.catch()` ile hatayı yakalayın         |

---

## Topluyo API Dökümanı

[https://topluyo.com/!api](https://topluyo.com/!api)

---

İyi kodlamalar! 🚀

---
---

# 🇬🇧 English

`topluyo-bot` is the official Node.js library for building bots on the Topluyo platform. It connects to Topluyo's server via **WebSocket**, listens for messages, group events, and form submissions, then sends responses through the **REST API** using an automatic **batch queue** to minimize rate-limit pressure.

> ⚠️ **Mandatory Rule:** The bot account's nickname **must** contain the word `bot` at the **beginning** or **end**.  
> Examples: `botMuzo`, `MuzoBot`, `bot-helper`, `weatherbot`

---

## Installation

```bash
# npm (scoped)
npm install @topluyo/topluyo-bot

# or
npm install topluyo-bot
```

> **Requirement:** Node.js **v18** or higher (uses built-in `fetch` API).

---

## Getting a Token

Create a Bot Token from the **"Cihazlarım" (My Devices)** section of your Topluyo account.  
Store it in a `.token.json` file:

```json
"YOUR_BOT_TOKEN_HERE"
```

> ⚠️ Never share your token file and add it to `.gitignore`.

---

## Quick Start

### CommonJS

```js
const TopluyoBOT = require('topluyo-bot');
// or: require('@topluyo/topluyo-bot')

const TOKEN = require('./.token.json');
const bot = TopluyoBOT(TOKEN);

bot.on('connected', function () {
  console.log('Connected! ✅');
});

bot.on('message', function (message) {
  if (message.action === 'post/add' && message.message === '!test') {
    bot.post('/!api/post/add', {
      channel_id: message.channel_id,
      text: 'Online ⚡'
    });
  }
});
```

### ES Modules (ESM)

```js
import TopluyoBOT from 'topluyo-bot';
// or: import TopluyoBOT from '@topluyo/topluyo-bot'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const TOKEN = require('./.token.json');

const bot = TopluyoBOT(TOKEN);

bot.on('connected', () => console.log('Connected! ✅'));
bot.on('message', (message) => {
  if (message.action === 'post/add' && message.message === '!test') {
    bot.post('/!api/post/add', {
      channel_id: message.channel_id,
      text: 'Online ⚡'
    });
  }
});
```

### TypeScript

```ts
import TopluyoBOT, { BotInstance, BotMessage, PostAddMessage } from 'topluyo-bot';

const bot: BotInstance = TopluyoBOT('YOUR_TOKEN');

bot.on('message', function (data: BotMessage) {
  if (data.action === 'post/add') {
    // data: PostAddMessage — data.message, data.channel_id, data.user_id
    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `Hello, ${data.user_id}!`
    });
  }
  if (data.action === 'post/bumote') {
    // data: PostBumoteMessage — data.message.form, data.post_id, data.user_id
    console.log(data.message.form);
  }
});
```

> 💡 Available interfaces: `BotMessage`, `PostAddMessage`, `PostBumoteMessage`, `MessageSendMessage`, `GroupJoinMessage`, `GroupLeaveMessage`, `GroupKickMessage`

---

## API Reference

### `TopluyoBOT(token)`

Creates a bot instance, opens the WebSocket connection, and returns a `BotInstance`.

| Parameter | Type     | Description             |
|-----------|----------|-------------------------|
| `token`   | `string` | Topluyo Bot Token       |

**Returns:** `BotInstance`

---

### `bot.on(event, callback)`

Registers an event listener.

| Event           | Callback Signature                        | Description                               |
|-----------------|------------------------------------------|-------------------------------------------|
| `'open'`        | `() => void`                             | WebSocket connection opened               |
| `'connected'`   | `() => void`                             | Bot authenticated successfully            |
| `'close'`       | `() => void`                             | Connection closed (auto-reconnects)       |
| `'auth_problem'`| `() => void`                             | Invalid token; will not reconnect         |
| `'message'`     | `(data: BotMessage) => void`             | Message/event received — use `data.action` to distinguish types |
| `'error'`       | `(err: Error) => void`                   | WebSocket error occurred                  |
| `'*'`           | `(event: string, data: BotMessage \| Error) => void` | Wildcard — fires for every event |

---

### `bot.post(api, data)`

Sends a request to the Topluyo REST API. Requests are automatically **batched** to reduce rate-limit pressure.

| Parameter | Type     | Description                                  |
|-----------|----------|----------------------------------------------|
| `api`     | `string` | Endpoint path (e.g. `'/!api/post/add'`)      |
| `data`    | `object` | Request payload                              |

**Returns:** `Promise<any>`

```js
bot.post('/!api/post/add', {
  channel_id: message.channel_id,
  text: 'Hello!',
  code: ''    // optional: code block content
}).then(res => console.log(res));
```

---

### `bot.connect()`

Manually opens the WebSocket connection. Called automatically by `TopluyoBOT()` — you normally don't need to call this directly.

---

### `bot.ws`

The raw `WebSocket` instance, accessible for advanced use cases.

---

## `message` Event Data

Objects received in the `message` event differ by their `data.action` field. TypeScript users have a dedicated interface for each type.

---

### `post/add` — New Post

**TypeScript:** `PostAddMessage`

| Field        | Type      | Description                           |
|--------------|-----------|---------------------------------------|
| `action`     | `'post/add'` | Event type                         |
| `message`    | `string`  | Text content of the post              |
| `channel_id` | `string`  | ID of the channel the post was sent in|
| `user_id`    | `number`  | ID of the user who sent the post      |

```js
bot.on('message', (data) => {
  if (data.action === 'post/add') {
    console.log(data.message);    // post text
    console.log(data.channel_id); // channel ID
    console.log(data.user_id);    // sender user ID

    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `You said: ${data.message}`
    });
  }
});
```

---

### `post/mention` — Mention

**TypeScript:** `PostMentionMessage`

| Field        | Type      | Description                              |
|--------------|-----------|------------------------------------------|
| `action`     | `'post/mention'` | Event type                         |
| `message`    | `string`  | Text of the post containing the mention  |
| `channel_id` | `string`  | ID of the channel the mention occurred in|
| `user_id`    | `number`  | ID of the user who mentioned the bot     |

```js
bot.on('message', (data) => {
  if (data.action === 'post/mention') {
    console.log(data.message);    // post text with mention
    console.log(data.channel_id); // channel ID
    console.log(data.user_id);    // mentioning user ID

    bot.post('/!api/post/add', {
      channel_id: data.channel_id,
      text: `Hey, you mentioned me! 👋`
    });
  }
});
```

---

### `post/bumote` — Form Submission

**TypeScript:** `PostBumoteMessage`

| Field             | Type      | Description                                     |
|-------------------|-----------|-------------------------------------------------|
| `action`          | `'post/bumote'` | Event type                                |
| `message.form`    | `Record<string, string>` | Submitted form fields (key → value) |
| `message.submit`  | `string`  | Label of the submit button                      |
| `post_id`         | `number`  | ID of the post the bumote was submitted on      |
| `user_id`         | `number`  | ID of the user who submitted the form           |

```js
bot.on('message', (data) => {
  if (data.action === 'post/bumote') {
    const form = data.message.form; // { name: 'Hasan', burc: 'Koç', ... }
    console.log(form.name);         // form field: name
    console.log(data.post_id);      // post ID
    console.log(data.user_id);      // submitter user ID
  }
});
```

---

### `message/send` — User Message

**TypeScript:** `MessageSendMessage`

| Field     | Type      | Description                           |
|-----------|-----------|---------------------------------------|
| `action`  | `'message/send'` | Event type                     |
| `message` | `string`  | Text content of the message           |
| `user_id` | `number`  | ID of the user who sent the message   |

```js
bot.on('message', (data) => {
  if (data.action === 'message/send') {
    console.log(data.message); // message text
    console.log(data.user_id); // sender user ID
  }
});
```

---

### Group Events

**TypeScript:** `GroupJoinMessage` | `GroupLeaveMessage` | `GroupKickMessage`

| Field      | Type      | Description                           |
|------------|-----------|---------------------------------------|
| `action`   | `'group/join'` \| `'group/leave'` \| `'group/kick'` | Event type |
| `group_id` | `number`  | ID of the group                       |
| `user_id`  | `number`  | ID of the affected user               |

```js
bot.on('message', (data) => {
  if (data.action === 'group/join')
    console.log(data.user_id, 'joined group', data.group_id);
  if (data.action === 'group/leave')
    console.log(data.user_id, 'left group', data.group_id);
  if (data.action === 'group/kick')
    console.log(data.user_id, 'kicked from group', data.group_id);
});
```

---

### `turbo/transfer` — Turbo Transfer

**TypeScript:** `TurboTransferMessage`

| Field               | Type      | Description                                   |
|---------------------|-----------|-----------------------------------------------|
| `action`            | `'turbo/transfer'` | Event type                           |
| `message.message`   | `string`  | Note/message attached to the transfer         |
| `message.quantity`  | `number`  | Amount of turbo transferred                   |
| `transfer_id`       | `number`  | ID of the transfer                            |
| `user_id`           | `number`  | ID of the user who sent the transfer          |

```js
bot.on('message', (data) => {
  if (data.action === 'turbo/transfer') {
    console.log(data.user_id, 'sent turbo');
    console.log('Amount:', data.message.quantity); // e.g. 0.01
    console.log('Note:', data.message.message);    // e.g. 'test'
    console.log('Transfer ID:', data.transfer_id);
  }
});
```

---

## Auto-Reconnect

When the connection drops, the bot waits **1 second** and automatically reconnects. This behaviour stops if an `auth_problem` event is received (invalid tokens don't loop).

---

## Error Handling

| Situation          | Description                        | Resolution                              |
|--------------------|------------------------------------|-----------------------------------------|
| `auth_problem`     | Token is invalid or expired        | Generate a new token from the panel     |
| `error` event      | WebSocket connection error         | Log it; the bot will retry automatically|
| `post` failure     | API request failed                 | Use `.catch()` on the returned Promise  |

---

## Topluyo API Docs

[https://topluyo.com/!api](https://topluyo.com/!api)

---

Happy coding! 🚀

