# ForestBiometry | Minör Revizyon Havuzu

> **Amaç:** Siteyi kullanırken fark edilen küçük iyileştirme ve hata düzeltme taleplerini tek dosyada biriktirmek. Bu belge belirli aralıklarla Claude'a verilecek. Buradaki maddeler, ayrıca görevlendirilmedikçe uygulanmış veya onaylanmış sayılmaz.

**Son güncelleme:** 2026-11-19  
**Kapsam:** Arayüz, kullanıcı deneyimi, metin, kullanılabilirlik ve küçük işlevsel düzeltmeler.  
**Durum anahtarı:** `Bekliyor` · `İnceleniyor` · `Uygulandı` · `Doğrulandı` · `Ertelendi`  
**Öncelik:** `Düşük` · `Orta` · `Yüksek`

## Revizyon listesi

| ID | Alan / sayfa | Kısa talep | Öncelik | Durum |
|---|---|---|---|---|
| MR-001 | Dashboard | Grafikler arasında gezinmek için navigasyon düğmeleri eklenmesi | Orta | Bekliyor |

## Revizyon ayrıntıları

### MR-001 | Dashboard: Grafikler arası navigasyon

- **Alan / sayfa:** Dashboard
- **Tür:** Kullanılabilirlik / arayüz iyileştirmesi
- **Öncelik:** Orta
- **Durum:** Bekliyor
- **Mevcut durum / gözlem:** Dashboard sayfasındaki grafikler (*plotlar*) arasında gezinmeyi kolaylaştıracak navigasyon düğmeleri isteniyor. Mevcut gezinme davranışı henüz ayrıntılı olarak tanımlanmadı.
- **İstenen revizyon:** Kullanıcının dashboard üzerindeki grafikler arasında daha kolay geçiş yapabilmesi için uygun navigasyon düğmeleri eklenmesi.
- **Beklenen davranış / kabul ölçütleri:**
  - Kullanıcı ilgili grafiklere navigasyon düğmeleriyle kolayca ulaşabilmeli.
  - Düğmelerin işlevi ve yönü anlaşılır olmalı.
  - Mevcut grafikler, hesaplamalar ve diğer dashboard işlevleri bozulmamalı.
  - Masaüstü ve mobil görünümde kullanılabilir olmalı.
- **Uygulama notu:** Düğmelerin konumu, isimleri ve gezinme modeli (grafikler arasında geçiş, sayfa içi kaydırma vb.) mevcut dashboard yapısı incelendikten sonra belirlensin. Belirsizlik varsa uygulamadan önce öneri sunulsun.
- **Doğrulama / sonuç:** _Uygulamadan sonra doldurulacak._

---

## Yeni revizyon ekleme şablonu

Aşağıdaki bloğu kopyalayıp `MR-002`, `MR-003` şeklinde devam edin. Üstteki özet tabloya da bir satır ekleyin.

```markdown
### MR-002 | Kısa başlık

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
