# ForestBiometry | Minör Revizyon Havuzu

> **Amaç:** Siteyi kullanırken fark edilen küçük iyileştirme ve hata düzeltme taleplerini tek dosyada biriktirmek. Bu belge belirli aralıklarla Claude'a verilecek. Buradaki maddeler, ayrıca görevlendirilmedikçe uygulanmış veya onaylanmış sayılmaz.

**Son güncelleme:** 2026-11-20  
**Kapsam:** Arayüz, kullanıcı deneyimi, metin, kullanılabilirlik ve küçük işlevsel düzeltmeler.  
**Durum anahtarı:** `Bekliyor` · `İnceleniyor` · `Uygulandı` · `Doğrulandı` · `Ertelendi`  
**Öncelik:** `Düşük` · `Orta` · `Yüksek`

## Revizyon listesi

| ID | Alan / sayfa | Kısa talep | Öncelik | Durum |
|---|---|---|---|---|
| MR-001 | Dashboard | Grafikler arasında gezinmek için navigasyon düğmeleri eklenmesi | Orta | Doğrulandı |
| MR-002 | Dashboard | Sayfa adının Data Visualization / Veri Görselleştirme olarak değiştirilmesi | Düşük | Doğrulandı |
| MR-003 | Anasayfa / araç oturumları | Tüm araç oturumlarını sıfırlayan genel düğme eklenmesi | Orta | Doğrulandı |

## Revizyon ayrıntıları

### MR-001 | Dashboard: Grafikler arası navigasyon

- **Alan / sayfa:** Dashboard
- **Tür:** Kullanılabilirlik / arayüz iyileştirmesi
- **Öncelik:** Orta
- **Durum:** Doğrulandı (kullanıcı onayı, 20 Kasım 2026; uygulandı 20 Kasım 2026; gezinme modeli kullanıcı seçimi: yapışkan atlama çubuğu)
- **Mevcut durum / gözlem:** Dashboard sayfasındaki grafikler (*plotlar*) arasında gezinmeyi kolaylaştıracak navigasyon düğmeleri isteniyor. Mevcut gezinme davranışı henüz ayrıntılı olarak tanımlanmadı.
- **İstenen revizyon:** Kullanıcının dashboard üzerindeki grafikler arasında daha kolay geçiş yapabilmesi için uygun navigasyon düğmeleri eklenmesi.
- **Beklenen davranış / kabul ölçütleri:**
  - Kullanıcı ilgili grafiklere navigasyon düğmeleriyle kolayca ulaşabilmeli.
  - Düğmelerin işlevi ve yönü anlaşılır olmalı.
  - Mevcut grafikler, hesaplamalar ve diğer dashboard işlevleri bozulmamalı.
  - Masaüstü ve mobil görünümde kullanılabilir olmalı.
- **Uygulama notu:** Düğmelerin konumu, isimleri ve gezinme modeli (grafikler arasında geçiş, sayfa içi kaydırma vb.) mevcut dashboard yapısı incelendikten sonra belirlensin. Belirsizlik varsa uygulamadan önce öneri sunulsun.
- **Doğrulama / sonuç:** Özet kutucuklarının altında, grafiklerin üstünde bir düğme satırı (Çap dağılımı, Tür katılımı, Hektarda ağaç sayısı, Hektarda göğüs yüzeyi, Boy–çap, Ağaç haritası; yalnız çizilen grafikler) ve sağda **↑ Süzgeçler**. Satır sayfa kayarken üst çubuğun altında kalır; düğme grafiğe kaydırır (hareket azaltma tercihinde anında), seçilen ve sonra ekranda en çok görünen grafiğin düğmesi vurgulanır; telefonda satır kendi içinde yana kayar, sayfada yatay kaydırma olmaz. Grafikler, hesaplar, süzgeçler ve dışa aktarmalar değişmedi. Kılavuza (TR/EN) bir cümle eklendi. Test: DI-04 e2e (masaüstü ve telefon; normal ve `FB_BUNDLE=1`).

---

### MR-002 | Dashboard: Sayfanın yeniden adlandırılması

- **Alan / sayfa:** Dashboard
- **Tür:** Arayüz metni / yerelleştirme
- **Öncelik:** Düşük
- **Durum:** Doğrulandı (kullanıcı onayı, 20 Kasım 2026; uygulandı 20 Kasım 2026)
- **Mevcut durum / gözlem:** Dashboard adı, grafik inceleme sayfası için genel bakış veya kontrol paneli beklentisi yaratabiliyor.
- **İstenen revizyon:** Sayfanın görünen adını İngilizcede **Data Visualization**, Türkçede **Veri Görselleştirme** olarak değiştir.
- **Beklenen davranış / kabul ölçütleri:**
  - Sayfa başlığı, menü ve varsa araç kartı, seçili dilde aynı adı göstermeli.
  - Mevcut sayfa adresi, bağlantılar, grafikler ve hesaplamalar korunmalı.
- **Doğrulama / sonuç:** Görünen ad TR "Veri Görselleştirme", EN "Data Visualization": sayfa başlığı ve üst satırı (`pano.php`), yan menü ve dizin kartı (`inc/site.php`), katalog (`inc/catalog.php`, DI-04), kılavuz (Veri Görselleştirme, İş akışı, Envanter Verisi Yöneticisi, Rapor Üretici bölümleri), Envanter Verisi Yöneticisi notu ve Rapor Üretici'nin "Veri Görselleştirme'deki kayıtları al" düğmesi. Adres (`pano.php`, `kilavuz.php?k=pano`), oturum anahtarı, indirilen dosya adları (`pano-…`, `dashboard-…`) ve hesaplar değişmedi. Testler: DI-04, DI-05, DI-03 ve site e2e (normal ve `FB_BUNDLE=1`), kılavuz testi.

---

### MR-003 | Anasayfa: Tüm araç oturumlarını sıfırlama

- **Alan / sayfa:** Anasayfa / araç oturumları
- **Tür:** Küçük işlevsel iyileştirme
- **Öncelik:** Orta
- **Durum:** Doğrulandı (kullanıcı onayı, 20 Kasım 2026; uygulandı 20 Kasım 2026)
- **İstenen revizyon:** Anasayfaya **Tüm Araç Oturumlarını Sıfırla** (EN: **Reset All Tool Sessions**) düğmesi ekle.
- **Beklenen davranış / kabul ölçütleri:**
  - Düğme, araçları tek tek açmaya gerek kalmadan tüm araç oturumlarını başlangıç durumuna döndürmeli. Her araç için mevcut sıfırlama davranışı esas alınmalı.
  - İşlem öncesinde kapsamı açıklayan bir onay gösterilmeli. İptal edildiğinde hiçbir oturum sıfırlanmamalı.
  - Araç sayfalarındaki **Reset Session** düğmeleri eskisi gibi yalnızca ilgili aracı sıfırlamalı.
- **Doğrulama / sonuç:** Ana sayfanın sağ sütununda, "Ne yapmak istiyorsunuz?" listesinin üstünde kırmızı çerçeveli **Baştan başlamak mı istiyorsunuz?** kutusu (20 Kasım 2026 kullanıcı düzeltmeleri: ilk sürümde kutu yan sütunun altındaydı ve düğme maviydi; ikinci sürümde "İlk kez mi kullanıyorsunuz?" kutusunun altına alındı ama giriş bölümünde boşluk bıraktı); kırmızı **Tüm araç oturumlarını sıfırla** düğmesi (oturum ve etkin paket yokken pasif); kutuda kayıtlı oturum sayısı ve etkin veri paketinin adı. Düğme bütün `session:<araç>` anahtarlarını siler ve **etkin veri paketini etkisizleştirip siler** (kullanıcı düzeltmesi; `project:active`, `dataset:approved` ve etkin proje, `deleteProject` gibi). Onay penceresi silinecek paketi adıyla, "geri alınamaz" uyarısıyla ve yedek önerisiyle gösterir; Envanter Verisi Yöneticisi'ndeki öteki paketler, Katsayı Kütüphanesi ve indirilen dosyalar kalır; başka sekmede açık aracın oturumunu yeniden kaydedeceği uyarılır. İptalde hiçbir şey silinmez. Araçların kendi düğmeleri değişmedi (Bonitet'in düğmesi seçili seti korur, genel sıfırlama onu da bırakır). Test: site e2e bölüm 8 (konum ve renk, iptal, onay, silinen ve korunan anahtarlar, İngilizce, telefon; normal ve `FB_BUNDLE=1`).
---

---

## Yeni revizyon ekleme şablonu

Aşağıdaki bloğu kopyalayıp sıradaki numarayla (`MR-004`, `MR-005` …) devam edin. Üstteki özet tabloya da bir satır ekleyin.

```markdown
### MR-NNN | Kısa başlık

- **Alan / sayfa:**
- **Tür:** Arayüz / kullanılabilirlik / metin / hata düzeltme / diğer
- **Öncelik:** Düşük / Orta / Yüksek
- **Durum:** Bekliyor
- **Mevcut durum / gözlem:**
- **İstenen revizyon:**
- **Beklenen davranış / kabul ölçütleri:**
  -
- **Uygulama notu:**
- **Doğrulama / sonuç:** _Uygulamadan sonra doldurulacak._
```

## Claude için uygulama yönergesi

Bu dosya Claude'a bir revizyon turu için verildiğinde:

1. Önce projenin güncel durumunu ve ilgili sayfaları incele; listedeki taleplerin hâlâ geçerli olup olmadığını kontrol et.
2. **Yalnızca kullanıcı tarafından o tur için açıkça seçilen** `Bekliyor` maddeleri uygula. Seçilmemiş maddeleri değiştirme.
3. Belirsiz veya alternatif çözümleri olan maddelerde kısa bir yaklaşım öner ve önemli davranış kararlarını kullanıcı onayı olmadan varsayma.
4. Mevcut mimariyi koru; ilgisiz refaktöring, yeni bağımlılık veya bilimsel hesaplama algoritması değişikliği yapma.
5. Her madde için yapılan değişikliği, etkilenen dosyaları ve test/önizleme sonucunu özetle. Test edilemeyen hususları açıkça belirt.
6. Durumları yalnızca gerçekten ulaşılan aşamaya göre güncelle. `Doğrulandı` durumunu kullanıcı onayı veya açık doğrulama olmadan verme.
7. **Commit, push, PR, merge ve deploy işlemlerini kullanıcı açıkça istemedikçe yapma.** Mevcut dalı ve ilgisiz değişiklikleri koru.

> **Kullanım notu:** Bu dosyaya zaman içinde yeni talepler ekleyebilirsiniz. Bir revizyon turunda örneğin “MR-001–MR-005 maddelerini uygula” diyerek kapsamı netleştirin.
