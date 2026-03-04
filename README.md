# TopluyoBOT – Bot Dokümantasyonu  
**Versiyon:** 1.0.0  **Dil:** Türkçe  
**Oluşturulma Tarihi:** 2026‑03‑04

---

## 1. Giriş
TopluyoBOT, Topluyo.com API’sine bağlanarak otomatik mesajlaşma, post ekleme, grup yönetimi ve form‑tamamlama işlemlerini gerçekleştirebilen bir Node.js kütüphanesidir.  
Bu dokümantasyon, botu **Kurulum → Kullanım → Olaylar → Eylemler → Örnekler** adımlarıyla tanıtır.  

> **Not:** Topluyo hesabınızın “Cihazlarım” bölümünde oluşturulan bir **Token** gereklidir. Token dosyası `./.token.json` şeklinde, `"<YOUR_TOKEN>"` formatında olmalıdır.

---
## 2. Kurulum

1. **Node.js** kurulu olduğundan emin olun (`node --version`).

2. Proje klasörünü oluşturup içerisine `nodejs` klasörünü indirin.

3. Token dosyasını oluşturun (`.token.json`):

```json
"YOUR_TOPLUYO_TOKEN"
```

5. Bot dosyanızı (`bot.js`) aşağıdaki gibi oluşturun (örnek kod):

```js
// bot.js
const TOKEN = require("./.token.json");
const TopluyoBOT = require("./TopluyoBOT");
const bot = TopluyoBOT(TOKEN);

// Genel olay yakalama
bot.on("*", (event, data) => {
  if (event !== "message") console.log(event, data);
});

// Mesaj olaylarını işleme
bot.on("message", (message) => {
  console.log(message);

  // Post ekleme
  if (message.action === "post/add") {
    if (message.message === "!test") {
      bot.post("/!api/post/add", {
        channel_id: message.channel_id,
        text: "Aktifim ⚡"
      }).then(e => console.log("Post gönderildi", e));
    } else {
      bot.post("/!api/post/add", {
        channel_id: message.channel_id,
        text: `sen bana \`${message.message}\` mı dedin?`
      });
    }
  }

  // Grubla ilgili olaylar
  if (message.action === "group/join")
    console.log(message.user_id, "sunucuya katıldı");
  if (message.action === "group/leave")
    console.log(message.user_id, "sunucudan ayrıldı");
  if (message.action === "group/kick")
    console.log(message.user_id, "sunucudan atıldı");

  // Bumıte ait olay
  if (message.action === "post/bumote") {
    console.log(`${message.post_id} üzerinde bir bumote gönderildi`, message.message);
  }
});

```

6. Botu çalıştırın:

   ```bash
   node bot.js
   ```

---

## 3. Olay (Event) Sistemi

| Olay Adı | Açıklama | Örnek Veri |
|----------|----------|------------|
| **open** | Bağlantı açıldığında tetiklenir. | `{}` |
| **auth_problem** | Token bağlantısı geçerli değil ise | `{}` |
| **connected** | WebSocket üzerinden bağlanıldığında tetiklenir. | `{}` |
| **message** | Her türlü mesaj/işlem geldiğinde tetiklenir. | `{action: "...", ...}` |
| **error** | Bağlantı veya API hataları. | `{}` |
| **close** | Bağlantı kapandığında. | {} |

> **Not**: `message` olayı içinde `action` alanı, işlemin türünü belirler (aşağıda detaylı anlatılmıştır).

---

## 4. Eylemler (Actions)

### 4.1. `post/add`
> **Açıklama** – Yeni bir post geldiğinde çalışır.

### 4.2. `post/bumote`
> **Açıklama** – Bir postun üstüne “bumote” (form gönderildiğinde) eklenir.  

**Message İçeriği (Örnek)**  
```json
{
  "action": "post/bumote",
  "message": {
    "form": {
      "name": "Hasan ",
      "burc": "Koç"
    },
    "submit": "Gönder"
  },
  "post_id": 61406,
  "user_id": 8000
}
```

**İşlem Örneği**  
```js
if (message.action === "post/bumote") {
  const form = message.message.form; // {name: "...", burc: "..."}
  // form.name, form.burc kullanabilirsiniz
  console.log(`Kullanıcı ${form.name} (${form.burc}) formu gönderdik.`);
}
```

### 4.3. `message/send`
> **Açıklama** – Kullanıcıdan gelen normal mesaj.  
> **Kullanım** – Bot, gelen mesajı okuyabilir, yanıt gönderebilir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `user_id` | `number` | Mesajı gönderen kullanıcı ID’si. |
| `message` | `string` | Gönderilen metin. |

### 4.4. Grup İlişkili Eylemler
| Action | Açıklama | Örnek |
|--------|----------|-------|
| `group/join` | Kullanıcı grup (sunucu) katıldı. | `{action:"group/join", group_id:3253, user_id:17}` |
| `group/leave` | Kullanıcı grup (sunucu) ayrıldı. | `{action:"group/leave", group_id:3253, user_id:17}` |
| `group/kick` | Kullanıcı grup (sunucu) dışarı atıldı. | `{action:"group/kick", group_id:3253, user_id:17}` |

---

## 5. Örnek Senaryolar

| Senaryo | Açıklama | Kod |
|---------|----------|-----|
| **Test Komutu** | `!test` yazıldığında bot “Aktifim ⚡” postu gönderir. | Yukarıdaki `if(message.message==="!test")` bloğu. |
| **Yazılı Post** | Kullanıcı başka metin gönderdiğinde bot “sen bana `[metin]` mı dedin?” postu oluşturur. | `else` bloğundaki `bot.post` çağrısı. |
| **Form Eylemi** | Kullanıcı bir form gönderdiğinde bu form verileri okunur. | `if(message.action==="post/bumote")` bloğu. |
| **Grup Katılım** | Kullanıcı gruba katıldığında log kaydedilir. | `if(message.action==="group/join")` bloğu. |

---

## 6. Hata Yönetimi

| Hata Durumu | Açıklama | Önerilen Çözüm |
|-------------|----------|----------------|
| `token` eksik | Token dosyası bulunamadı. | `.token.json` dosyasını kontrol edin. |
| `auth_problem` | Token geçersiz. | Token’ı yeniden oluşturun. |
| `api error` | API yanıtı 4xx/5xx. | API dökümantasyonuna göz atın, rate limit kontrolü yapın. |

> **İpucu**: Hata olaylarını dinleyebilirsiniz:  
```js
bot.on("error", (err) => console.error("Bot Hatası:", err));
```

---

## 7. Sonuç

Topluyo API Dökümantasyonuna: https://topluyo.com/!api adresinden ulaşabilirsiniz =)

İyi kodlamalar! 🚀