/**
 * ES Module uyumlu giriş noktası.
 *
 * CommonJS olarak yazılmış `index.js` modülünü `createRequire` aracılığıyla
 * yükler ve hem adlandırılmış (`export { TopluyoBOT }`) hem de varsayılan
 * (`export default TopluyoBOT`) olarak dışa aktarır.
 *
 * Bu dosya doğrudan import edilmemeli; `package.json` içindeki
 * `exports["."}.import` alanı üzerinden otomatik olarak seçilir.
 *
 * @module topluyo-bot/esm
 */
import { createRequire } from 'module';

/** Node.js ESM ortamında CommonJS `require` fonksiyonunu kullanılabilir kılar. */
const require = createRequire(import.meta.url);

/**
 * `TopluyoBOT` fonksiyonu — bkz. {@link ./index.js} ve `index.d.mts`.
 *
 * @type {import('./index.d.mts').default}
 */
const TopluyoBOT = require('./index.js');

export { TopluyoBOT };
export default TopluyoBOT;
