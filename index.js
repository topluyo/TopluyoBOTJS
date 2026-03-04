const WebSocket = require('ws');



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
   * - `'message'`      — Sunucudan mesaj geldi (parsed JSON)
   * - `'error'`        — WebSocket hatası oluştu
   * - `'*'`            — Tüm olayları dinler (event, data) şeklinde tetiklenir
   *
   * @param {string}   event    - Dinlenecek olay adı
   * @param {Function} callback - Olay tetiklendiğinde çağrılacak fonksiyon;
   *                              `this` bağlamı bot örneğine bağlıdır
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