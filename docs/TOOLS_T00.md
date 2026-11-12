# T00: yeni araçlar için mevcut kodun incelenmesi

Tarih: 12 Kasım 2026. Kapsam: `docs/TOOLS_SPEC.md` (K1–K9 onaylı) ve `main` @ `0fa667d` (çap dağılımı 2.1.0). Bu aşamada **kod değiştirilmedi**.

## 1. Yeniden kullanılacak çekirdek

| Modül | Ne verir | Yeni araçlarda kullanımı | Eksik |
|---|---|---|---|
| `core/importer.js`, `core/table.js`, `core/num.js` | CSV/TSV/XLSX okuma, ayırıcı/kodlama, ondalık ayarı ve kanıtı, birim dönüşümü (`UNITS`) | Bütün araçlar; gövde ölçüm tablosu (`stem-sections/1`) da bu panelle okunur | `UNITS`'te çap (cm/mm), boy, alan, xy var; **mm cinsinden kabuk kalınlığı** ve yaş için birim yok (T01'de eklenir) |
| `core/store.js` | IndexedDB anahtar–değer (`forestbiometry`/`kv`), bellek yedeği | Oturumlar, onaylanmış veri; katsayı kaydı için yeni anahtar ad alanı `coef:` | Anahtar listesi dosyanın başındaki yorumda; yeni anahtarlar oraya yazılmalı |
| `core/export.js` | CSV (`,`/`.`), çok sayfalı XLSX, JSON | Bütün araçlar | – |
| `core/unitnav.js` | Örnek alan gezgini | Bonitet, yapı, biyokütle (çok birimli veri) | – |
| `core/chart.js` | çubuk, saçılım, sürekli eksen (çizgi/basamak/nokta), radar | Profil (`plotChart` çizgi + nokta), bonitet eğri demeti, Lorenz eğrisi, histogram | **Gövde haritası yok** (koordinat, büyüklüğe göre daire, değere göre işaret): SS04 için yeni bir `mapChart` gerekir. Seksiyon dökümü çizimi (yatay gövde, seksiyon sınırları) de yeni |
| `core/nls.js` | Levenberg–Marquardt, kovaryans σ̂²(JᵀJ)⁻¹, delta yöntemi, OLS | SI03 (bonitet uydurma), TP02 (profil uydurma), SV04 | Model nesnesi **analitik gradyan** ister (`grad(θ, x)`); bonitet fark denklemleri ve profil biçimleri için gradyan yazılır ya da sayısal türev seçeneği eklenir (karar T01/SI03'te; testte sayısal türevle karşılaştırılır) |
| `core/roots.js` | Brent, geometrik ikiye bölme | SI01 (temel modelin SI için çözümü), TP01 (h(d)) | Çoklu kök tarayıcı `dist/recover/weibull.js` içinde (`scanRoots`); profilde de lazım olacak → `core/roots.js`'e taşınabilir (davranış değişmeden) |
| `core/quad.js` | Gauss–Legendre düğümleri, normal altında beklenen değer | TP01 hacim integrali | **Sonlu aralıkta uyarlamalı integral yok**: bileşik Gauss–Legendre + hata tahmini (ör. 10 ve 20 düğüm farkı) eklenmeli |
| `core/optim.js` | Nelder–Mead | Yedek optimizasyon | – |
| `core/stats.js` | dağılımlar, `rng`, `shuffle` | SI04, BC04 bootstrap/Monte Carlo için tohumlu üreteç | – |
| `core/citation.js`, `cite-ui.js` | Atıf penceresi | Yeni araçlar `site_tools()` satırıyla otomatik | – |
| Web Worker düzeni | `dist/boot-worker.js`, `dist/stand-worker.js` | SS02 (10 000+ ağaçta komşu arama), SI04, BC04 | Ortak bir worker yardımcısı yok; her araç kendi worker'ını yazıyor (dağılım aracındaki düzen örnek alınır) |

## 2. Örnek Alan ve Meşcere aracından paylaşılacaklar

`assets/lab/stand/calc.js` zaten DOM'suz ve dışarıdan içe aktarılabilir (Model Başarısı aracı `classIndex` ve `classesFromBreaks`'i buradan alıyor). Paylaşılacak işlevler:

| İşlev | Ne yapar | Kullanacak araç |
|---|---|---|
| `validateDataset`, `periodsOf`, `statusesOf` | `forest-dataset/1` denetimi, dönemler, durumlar | hepsi |
| `buildUnits` | örnek alan × dönem birimleri (boş/ölçülmemiş birleşim kuralı dahil) | SI, SS, BC |
| `unitMetrics` | N/ha, G/ha, Dq, tür payları, ölçülmüş/tahmini boy ayrımı, yaş, D0/H0 | SI (H0), SS (N, Dq, G), BC (genişletme) |
| `dominantWeights`, `dominant` | hektarda en büyük 100 ağaç (kesirli k, eşitlerde paylaşım; boy için yalnızca ölçülmüş boylar) | SI02 (H0), SS |
| `classesFromBreaks`, `breaksFromWidth`, `classIndex` | yarı açık çap sınıfları | SS01 (Shannon), BC |
| `tableToDataset` | ham tablo → `forest-dataset/1` (doğrudan yükleme yolu) | SI, SS, BC (Denetçi'siz yükleme) |

**En küçük değişiklik:** taşıma gerekmez. Yeni araçlar bu işlevleri `../stand/calc.js`'ten doğrudan içe aktarır (Model Başarısı'nın yaptığı gibi). TOOLS_SPEC T01'deki "paylaşılabilir modüle taşı" maddesi bu yüzden **gereksiz**: taşımak Örnek Alan aracının dosya düzenini değiştirir ve yarar getirmez. Öneri: T01'de taşıma yerine bu işlevlerin dışa açık sözleşmesini (girdi/çıktı) METHODS §6'ya yazmak ve yeni araçların bu sözleşmeye karşı test edilmesi.

Dikkat edilecek iki nokta:
- Genişletme faktörü yalnızca **sabit alanlı** örnek alanlar içindir (EF = 10000/A; iç içe örnek alan ve Bitterlich yok, dosyanın başında yazılı). Yapı ve biyokütle araçları bu sınırlamayı devralır ve ekranda yazmalıdır.
- Çap dağılımı aracının kendi birim kurucusu (`dist/data.js` `extractUnits`) ham tablodan yalnızca çap okur; yeni araçlar için uygun değil. İki birim kurucusu yan yana kalır; yeni araçlar `buildUnits` + `tableToDataset` yolunu kullanır.

## 3. Veri sözleşmeleri

### 3.1. `forest-dataset/1`
- Bonitet için `age` alanı **var** (ağaç düzeyi; Örnek Alan aracının doğrudan yüklemesi dolduruyor, Denetçi eşlemiyor). **Yaş türü (K8) için alan yok.** Öneri: yaş türü veri setinin değil, bonitet aracındaki ayarın parçası olsun (K8 "her veri setinde açıkça seçilir" böyle sağlanır); şema değişmez.
- `x`, `y` alanları var (Denetçi eşliyor, birim m). **Koordinatların neye göre olduğu (örnek alan merkezi mi, ortak sistem mi) ve örnek alan geometrisi (daire/dikdörtgen, merkez, yarıçap, köşeler) sözleşmede yok.** SS02'nin kenar düzeltmesi bunlara muhtaçtır. Öneri: geometri meşcere yapısı aracında **ayar** olarak girilsin (örnek alan başına tablo ya da hepsine ortak); `forest-dataset/1` değişmesin. İleride Denetçi'ye eklenirse `forest-dataset/2` gerekir.
- `height_source` (ölçülmüş/tahmini) var; biyokütlede "tahmini boyla hesaplanan ağaç sayısı" (BC01) bu alandan okunur.

### 3.2. `stem-sections/1` (yeni)
- Denetçi ikinci bir tablo türünü (gövde ölçümleri) desteklemiyor; ağaç ve örnek alan tablolarına göre kurulmuş (`FIELDS = { trees, plots }`). Öneri: gövde ölçüm tablosu seksiyon hacmi ve gövde profili araçlarında **kendi eşleme ekranıyla** okunur (çap dağılımı aracının ham tablo yaklaşımı gibi); kontroller `core/stems.js`'te ortak. Denetçi'ye eklemek ayrı ve sonraki bir iştir.
- Ağaç düzeyi alanların (dbh, boy, kesim yüksekliği) iki kaynağı olabilir: aynı tablonun sütunları ya da onaylanmış ağaç tablosu. Birleştirme anahtarı `plot_id` + `tree_id` (+ `period`); kimlikler metin (Denetçi kuralı).

### 3.3. `model-coef/1` (yeni)
- Depoda `coef:<id>` anahtarlarıyla ya da tek bir `coef:library` nesnesiyle tutulabilir. Öneri: **tek kayıt başına bir anahtar** (`coef:<id>`), çünkü `store.js` liste/anahtar tarama işlevi sunmuyor; bu durumda bir dizin anahtarı (`coef:index`) da gerekir. Alternatif: `store.js`'e anahtar önekiyle listeleme eklemek (küçük, testli değişiklik). T01'de karar verilecek; ikincisi daha temiz.

## 4. Site kabuğu, kılavuz ve testler

| Yer | Etki |
|---|---|
| `inc/site.php` `site_cats()` | 4 kategori var (data, inventory, dist, model); K3'teki iki kategori eklenir (`tree`, `site` gibi kimliklerle). Kategorisiz kalan kategori ana sayfada boş görünür mü kontrol edilmeli: kategori, ilk aracı eklenene kadar eklenmemeli (T01 metni "kategorileri ekle" diyor; **araçsız kategori boş bir başlık doğurur**, bu yüzden her kategori ilk aracıyla birlikte eklenmeli) |
| `site_tools()` | Her araç bir satır (`cat`, `icon`, `short`, `file`, `v`, `lab`) |
| `site_icon()` | Beş yeni simge (çizgi, 24 × 24) |
| `tests/site/test_guide.mjs` | Araç sayısı **sabit yazılmış** (`tools.length === 7`); her yeni araçta güncellenir ya da "site_tools satırı kadar" diye genelleştirilir. Kılavuzda adı geçen etiketler listesi araç başına eklenir |
| `tests/site/test_cite.mjs` | Araç sayısı sabit (`rows.length === 7`); sürüm `assets/lab/<lab>/calc.js` içindeki `export const TOOL = { id: '…', version: '…' }` satırından okunuyor (yalnızca `dist` istisna). Yeni araçlar `TOOL`'u `calc.js`'te bu biçimde tanımlamalı |
| `tests/site/e2e.mjs` | Kenar çubuğu ve ana sayfa kontrolleri; kategori sayısı varsayımları kontrol edilmeli |
| `.github/workflows/deploy.yml` | Testler tek tek yazılı; her yeni test dosyası eklenmeli |
| `inc/guide/tr.php`, `en.php` | Her araç için bölüm (kimlik = dosya adı); kılavuzsuz araç yayına çıkmaz |

## 5. TOOLS_SPEC ile çelişen ya da düzeltilmesi gereken noktalar

1. **BC03 ve Bölüm 5.1-B, "Örnek Alan aracındaki kullanıcı hacmi":** Örnek Alan ve Meşcere aracında **hacim hesabı yok** (`stand/calc.js`'te hacim yok; METHODS §1 bunu "sonraki modüllerde yeniden yazılacak" diye listeliyor). Hacimden biyokütle yolu için hacim kaynağı şimdilik yalnızca Seksiyon hacmi aracı ve elle giriş olur. Şartnamede bu ifade düzeltilmeli (karar: kullanıcı).
2. **T01, "Örnek Alan hesaplarını paylaşılabilir modüle taşı":** gereksiz (Bölüm 2). Taşıma yerine doğrudan içe aktarma.
3. **T01, "site_cats()'a kategorileri ekle (araçlar henüz eklenmez)":** araçsız kategori boş başlık doğurur. Kategori, ilk aracıyla birlikte eklenmeli (SV02 ve SI02).
4. **SS02 örnek alan geometrisi:** veri sözleşmesinde yok; aracın ayarı olarak girilir (Bölüm 3.1). Şartnamede "kullanıcı verir" yazıyor, çelişki yok; yalnızca yerinin ayar olduğu netleşmeli.
5. **Gradyan:** `core/nls.js` analitik gradyan istiyor; SI03 ve TP02 promptlarında bu belirtilmemiş. Öneri: biçim kaydında her biçim analitik gradyanını taşır ve test sayısal türevle karşılaştırır.
6. **Uyarlamalı integral** `core/quad.js`'te yok; TP01'in "kapalı biçim yoksa uyarlamalı Gauss–Legendre" ifadesi için eklenmeli (TP01 kapsamında).

Bunların hiçbiri K1–K9 kararlarıyla çelişmiyor; 1–3 şartname metninin düzeltilmesini gerektiriyor.

## 6. Öneri: T01'in güncellenmiş kapsamı

- `core/coef.js` (+ `store.js`'e önekle listeleme), `core/coef-ui.js`, `core/stems.js`, `UNITS`'e kabuk kalınlığı (mm) ve yaş.
- `scanRoots`'un `core/roots.js`'e taşınması (dağılım testleri değişmeden geçmeli).
- `test_guide.mjs` ve `test_cite.mjs`'teki araç sayısının `site_tools()`'tan okunması (sabit 7 yerine).
- Örnek Alan işlevleri taşınmaz; sözleşmeleri METHODS §6'ya yazılır.
- Kategoriler T01'de eklenmez; ilk araçlarıyla eklenir.
