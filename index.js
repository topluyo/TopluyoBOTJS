const WebSocket = require('ws');

// ---------------------------------------------------------------------------
// Mesaj payload typedef'leri (JSDoc / VS Code IntelliSense için)
// ---------------------------------------------------------------------------

/**
 * Kanala yeni bir post eklendiğinde gelen mesaj (action: 'post/add')
 * @typedef {object} PostAddMessage
 * @property {'post/add'} action      - Olay türü
 * @property {string}     message     - Postu gönderen kullanıcının mesaj metni
 * @property {string}     channel_id  - Mesajın geldiği kanalın ID'si
 * @property {number}     user_id     - Mesajı gönderen kullanıcının ID'si
 */

/**
 * Bir post içinde bot mention edildiğinde gelen mesaj (action: 'post/mention')
 * @typedef {object} PostMentionMessage
 * @property {'post/mention'} action      - Olay türü
 * @property {string}         message     - Mention içeren post metni
 * @property {string}         channel_id  - Mention'ın gerçekleştiği kanalın ID'si
 * @property {number}         user_id     - Botu mention eden kullanıcının ID'si
 */

/**
 * Bir post üzerinde bumote formu gönderildiğinde gelen mesaj (action: 'post/bumote')
 * @typedef {object} PostBumoteMessage
 * @property {'post/bumote'}             action    - Olay türü
 * @property {{ form: Record<string,string>, submit: string }} message - Form verisi ve submit etiketi
 * @property {number}                    post_id   - Bumote'un gönderildiği postun ID'si
 * @property {number}                    user_id   - Formu gönderen kullanıcının ID'si
 */

/**
 * Kullanıcıdan gelen direkt mesaj (action: 'message/send')
 * @typedef {object} MessageSendMessage
 * @property {'message/send'} action   - Olay türü
 * @property {string}         message  - Gönderilen mesaj metni
 * @property {number}         user_id  - Mesajı gönderen kullanıcının ID'si
 */

/**
 * Kullanıcı gruba katıldığında gelen mesaj (action: 'group/join')
 * @typedef {object} GroupJoinMessage
 * @property {'group/join'} action    - Olay türü
 * @property {number}       group_id  - Grubun ID'si
 * @property {number}       user_id   - Katılan kullanıcının ID'si
 */

/**
 * Kullanıcı gruptan ayrıldığında gelen mesaj (action: 'group/leave')
 * @typedef {object} GroupLeaveMessage
 * @property {'group/leave'} action   - Olay türü
 * @property {number}        group_id - Grubun ID'si
 * @property {number}        user_id  - Ayrılan kullanıcının ID'si
 */

/**
 * Kullanıcı gruptan atıldığında gelen mesaj (action: 'group/kick')
 * @typedef {object} GroupKickMessage
 * @property {'group/kick'} action    - Olay türü
 * @property {number}       group_id  - Grubun ID'si
 * @property {number}       user_id   - Atılan kullanıcının ID'si
 */

/**
 * Bota turbo transferi gönderildiğinde gelen mesaj (action: 'turbo/transfer')
 * @typedef {object} TurboTransferMessage
 * @property {'turbo/transfer'} action              - Olay türü
 * @property {{ message: string, quantity: number }} message - Transfer notu ve miktarı
 * @property {number}           transfer_id         - Transferin ID'si
 * @property {number}           user_id             - Transferi gönderen kullanıcının ID'si
 */

/**
 * bot.on('message', ...) callback'ine gelen tüm olası mesaj türleri.
 * `data.action` alanıyla olay türü ayrıştırılır.
 * @typedef {PostAddMessage|PostMentionMessage|PostBumoteMessage|MessageSendMessage|GroupJoinMessage|GroupLeaveMessage|GroupKickMessage|TurboTransferMessage} BotMessage
 */

// ---------------------------------------------------------------------------

/**
 * Topluyo REST API isteklerini toplu (batch) hâlde gönderen iç sınıf.
 * Birden fazla `api()` çağrısını biriktirip belirli aralıklarla tek bir HTTP
 * isteğiyle `/!apis` endpoint'ine gönderir; böylece rate-limit baskısını azaltır.
 *
 * @class
 */
class RouteClass {
  /**
   * RouteClass örneği oluşturur ve otomatik senkronizasyon döngüsünü başlatır.
   *
   * @param {object} options
   * @param {string} options.apiEndpoint - Topluyo REST API'nin taban URL'i (ör. `https://topluyo.com/`)
   * @param {string} options.authToken  - Bot kimlik doğrulama token'ı
   */
  constructor({ apiEndpoint, authToken }) {
    this.API_END_POINT = apiEndpoint;
    this.authToken = authToken;

    this.order = [];
    this.lastSyncTime = + Date.now();
    this.rateLimitMs = 1000;

    setInterval(() => this.autoSync(), 200);
  }

  /**
   * Kuyruktaki tüm bekleyen API isteklerini tek bir HTTP POST isteğiyle gönderir.
   * Her istek için ilgili Promise resolver'ı çağırarak sonuçları eşleştirir.
   * Kuyruğun boş olması durumunda hiçbir işlem yapmaz.
   *
   * @async
   * @returns {Promise<void>}
   */
  async sync() {
    if (this.order.length === 0) return;

    const order = this.order.splice(0);
    const body = order.map(e => ({
      api: e[0].api,
      data: e[0].data || {}
    }));

    try {
      const res = await fetch(this.API_END_POINT + "!apis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + this.authToken
        },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      const responseList = Object.values(json.data);

      let store = [];

      for (let i = 0; i < responseList.length; i++) {
        const d = responseList[i];
        store.push(d);

        const current = order[i];

        if (!current) continue;

        const resolver = current[1];
        const type = current[2];

        if (resolver) {
          if (type === "array") {
            resolver(store);
          } else {
            resolver(store[0]);
          }
          store = [];
        }
      }

    } catch (err) {
      console.error("SYNC ERROR:", err);
    }
  }

  /**
   * Periyodik olarak tetiklenen oto-senkronizasyon kontrolcüsüdür.
   * Kuyrukta bekleyen istek varsa ve son senkronizasyondan bu yana
   * `rateLimitMs` (varsayılan 1 000 ms) geçmişse `sync()` metodunu çağırır.
   *
   * @returns {void}
   */
  autoSync() {
    if (this.order.length === 0) return;
    const now = Date.now();
    if (now - this.lastSyncTime > this.rateLimitMs) {
      this.lastSyncTime = now;
      this.sync();
    }
  }

  /**
   * Bir veya birden fazla API isteğini kuyruğa ekler ve sonuçları döndüren
   * bir Promise oluşturur.
   *
   * - Tek istek: `{ api, data }` nesnesi verir, sonucunu `Promise<any>` olarak döner.
   * - Çoklu istek: `[{ api, data }, ...]` dizisi verir; tüm sonuçlar tek bir
   *   `Promise<any[]>` ile döner.
   *
   * @param {{ api: string, data?: object } | Array<{ api: string, data?: object }>} body
   *   Tek bir API nesnesi ya da API nesneleri dizisi
   * @returns {Promise<any>}
   */
  api(body) {
    if (Array.isArray(body)) {
      for (let i = 0; i < body.length - 1; i++) {
        this.order.push([body[i], null, "array"]);
      }

      return new Promise(res => {
        this.order.push([body[body.length - 1], res, "array"]);
      });

    } else {
      return new Promise(res => {
        this.order.push([body, res, "single"]);
      });
    }
  }
}






/**
 * Topluyo platformu için bir bot örneği oluşturur, WebSocket bağlantısını
 * kurar ve hazır `BotInstance` nesnesini döndürür.
 *
 * @param {string} token - Botun kimlik doğrulama token'ı
 * @returns {BotInstance}  Bağlanmış bot örneği
 *
 * @example
 * const TopluyoBOT = require('topluyo-bot');
 * const bot = TopluyoBOT('TOKEN');
 *
 * bot.on('connected', function() {
 *   console.log('Bağlandı!');
 * });
 *
 * bot.on('message', function(data) {
 *   console.log('Yeni mesaj:', data);
 * });
 */
function TopluyoBOT(token){
  let base = {}

  const Route = new RouteClass({
    apiEndpoint: "https://topluyo.com/",
    authToken: token
  });

  /**
   * Topluyo REST API'sine tek bir istek gönderir.
   *
   * @param {string} api          - Çağrılacak endpoint adı (ör. `'messages.send'`)
   * @param {object} [data={}]    - İsteğe eklenecek veri yükü
   * @returns {Promise<any>}       Sunucu yanıtı
   */
  base.post = function(api,data){
    return new Promise((res,req)=>{  
      Route.api({
        api: api,
        data: data
      }).then(r=>{
        res(r)
      });
    })
  }

  let _triggers = []
  /**
   * Belirtilen olaya bir dinleyici (listener) ekler.
   *
   * Desteklenen olaylar:
   * - `'open'`         — WebSocket bağlantısı açıldı
   * - `'connected'`    — Bot başarıyla kimlik doğruladı
   * - `'close'`        — Bağlantı kapandı
   * - `'auth_problem'` — Token geçersiz; yeniden bağlanılmaz
   * - `'message'`      — Sunucudan olay/mesaj geldi; `data.action` ile tür ayrıştırılır
   * - `'error'`        — WebSocket hatası oluştu
   * - `'*'`            — Tüm olayları dinler (event, data) şeklinde tetiklenir
   *
   * `'message'` olayındaki `data` nesnesi şu `action` değerlerini taşıyabilir:
   * - `'post/add'`      → `{ action, message, channel_id, user_id }`
   * - `'post/bumote'`   → `{ action, message: { form, submit }, post_id, user_id }`
   * - `'message/send'`  → `{ action, message, user_id }`
   * - `'group/join'`    → `{ action, group_id, user_id }`
   * - `'group/leave'`   → `{ action, group_id, user_id }`
   * - `'group/kick'`    → `{ action, group_id, user_id }`
   *
   * @param {string}   event    - Dinlenecek olay adı
   * @param {Function} callback - Olay tetiklendiğinde çağrılacak fonksiyon;
   *                              `this` bağlamı bot örneğine bağlıdır;
   *                              `'message'` olayı için `{BotMessage} data` alır
   * @returns {void}
   */
  base.on = function(event,callback){
    _triggers.push({event:event,callback:callback})
  }

  /**
   * Kayıtlı tüm dinleyiciler içinde belirtilen olayı yayar (emit).
   * `'*'` olayına kayıtlı dinleyiciler her olay için tetiklenir.
   *
   * @private
   * @param {string} event - Yayılacak olay adı
   * @param {*}      [data]  - Olaya iletilecek veri
   * @returns {void}
   */
  const emit = function(event,data){
    _triggers.map(e=>{
      if(e.event==event){
        e.callback.call(base,data)
      }
      if(e.event=="*"){
        e.callback.call(base,event,data)
      }
    })
  }

  let reconnect = true
  /**
   * WebSocket bağlantısını açar. Bağlantı koparsa 1 saniye sonra otomatik
   * olarak yeniden bağlanır (`auth_problem` olayı alınmadıkça).
   * `TopluyoBOT()` tarafından çağrıldığında otomatik olarak tetiklenir.
   *
   * @returns {void}
   */
  base.connect = function(){
    let ws = base.ws = new WebSocket('wss://topluyo.com/!bot');
    ws.on('open', () => {
      ws.send(token);
      setInterval(() => { if (ws.readyState === WebSocket.OPEN) { ws.ping(); } }, 30000);
      emit("open")
    });
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if(message=="AUTH_PROBLEM"){
        reconnect=false
        emit("auth_problem")
        return
      }
      if(message=="CONNECTED"){
        reconnect=true
        emit("connected")
        return
      }
      emit("message",message)
    });
    ws.on('close', () => {
      emit("close")
      if(reconnect) {
        setTimeout(e=>base.connect(),1000)
      }
    });
    ws.on('error', (err) => {
      emit("error",err)
    });
  }

  base.connect()

  return base
}


module.exports = TopluyoBOT