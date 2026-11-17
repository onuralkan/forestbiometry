# Gerekli kaynaklar (16 Kasım 2026)

☑ = kullanıcının Google Drive klasöründe (`MODUL_KAYNAK`, 16 Kasım 2026: 26 farklı kaynak). Okunup METHODS'ta işaretlenenler: Clark ve Evans 1954 [B], Pommerening 2002 [B], Contreras ve ark. 2011 [B] (Hegyi [A]).

**17 Kasım 2026 (kullanıcı kararı, PLATFORM_PLAN P8):** BC-05; SI-02, SI-04…SI-09; GY-01…GY-07; SM-07; ML-01, ML-04…ML-08; DS-01, DS-02, DS-04…DS-06 plandan çıkarıldı. Aşağıda yalnızca bu kimliklere bağlı kaynaklar artık istenmez; satırlar arşiv olarak duruyor, yeniden yüklenmesi gerekmez.

Planlı modüller (`docs/PLATFORM_PLAN.md`) için kaynaklar, iki bölümde:

1. **PDF gerekli:** denklem ya da yöntem birincil kaynaktan okunacak (yeterli paket yok, paket belgesi formülü
   yazmıyor ya da yöntem bir kitabın bütünü).
2. **Paket yeterli ([P]):** denklem biçimi bir CRAN paketinin yardım sayfasında açıkça yazılı; test referansı o
   paketin çıktısı olacak (`tests/ref/*.R`, kullanıcı R'da çalıştırır). Özgün makale yalnızca künye için yazılır,
   PDF gerekmez. Koşullar METHODS.md başında (16 Kasım 2026, kullanıcı kararı).

Künyeler bilgiden yazıldı **[D]**: yazar ve yıl güvenilir, cilt/sayfa yanlış olabilir. Paket sürümleri ve yardım
sayfaları 16 Kasım 2026'da CRAN'da (search.r-project.org) kontrol edildi. Kural (K1, P2): kaynaktan **denklem biçimi
ve yöntem** alınır; tür/yöre katsayısı, tablo değeri, paket verisi ya da varsayılan sabit siteye gömülmez.

Kaynak durumları: [B] özgün okundu, [P] paket belgesi, [A] aktarılan (ikincil kaynaktan), [İ]/[D] künye (METHODS başı).

Öncelik: **A** sıradaki aşamalar için şart; **B** o modüle gelince; **C** isteğe bağlı. **Açık** = okul ağı
gerekmez (açık erişim ya da ücretsiz belge).

---

## Bölüm 1. PDF gerekli

"Yerine olur [A]" sütunu: özgün kaynak bulunamazsa denklemi aktarmak için kullanılabilecek, özgüne atıf yapan görece
yeni bir kaynak (METHODS başındaki [A] koşulları: iki bağımsız ikincil kaynak aynı biçimi vermeli ya da biri paket
çıktısıyla veya çözümlü örnekle sayısal olarak tutmalı; ayrışma not ya da seçenek olur). Bir satırda iki öneri varsa
ikisi birlikte koşul 3'ü karşılar. "Yeni sayılır": kaynak zaten görece yeni, aktarmaya gerek yok.

### A — sıradaki aşamalar

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☑ | Pommerening, A. 2002. Approaches to quantifying forest structures. *Forestry* 75: 305–324. (yeniden yükle; `forestSAS` sayısal referans) | SS-05 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer |
| ☑ | Clark, P.J., Evans, F.C. 1954. Distance to nearest neighbor as a measure of spatial relationships in populations. *Ecology* 35: 445–453. (yeniden yükle; `spatstat` sayısal referans) | SS-06 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer |
| ☐ | Donnelly, K.P. 1978. Simulations to determine the variance and edge effect of total nearest-neighbour distance. Hodder (ed.), *Simulation Studies in Archaeology*, Cambridge Univ. Press. (yeniden yükle) | SS-06 | Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer (Donnelly düzeltmesini yazdığı kontrol edilecek); sayısal: `clarkevans(correction = "Donnelly")` |
| ☑ | Krajicek, J.E., Brinkman, K.A., Gingrich, S.F. 1961. Crown competition — a measure of density. *Forest Science* 7: 35–42. (yeniden yükle) | SS-02 CCF | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Weiskittel ve ark. 2011 (aşağıda, GY) |
| ☑ | Max, T.A., Burkhart, H.E. 1976. Segmented polynomial regression applied to taper equations. *Forest Science* 22: 283–289. (yeniden yükle) | SV-02 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302; Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Kozak, A. 2004. My last words on taper equations. *The Forestry Chronicle* 80: 507–515. | SV-02 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☑ | Kozak, A. 1988. A variable-exponent taper equation. *Canadian Journal of Forest Research* 18: 1363–1368. | SV-02 | Kozak 2004 (kendi modellerini yeniden yazar); Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☑ | Pnevmaticos, S.M., Mann, S.H. 1972. Dynamic programming in tree bucking. *Forest Products Journal* 22(2): 26–30. (bulunamadı; gerek kalmadı) | SV-06 | Grondin, F. 1998. Improvements of the dynamic programming algorithm for tree bucking. *Wood and Fiber Science* 30(1): 91–104 [B, özyineleme açık]; Bennemann, C., Lussier, J.-M., Labelle, E.R. 2025. *Forests* 16: 780 [B] (16 Kasım 2026, METHODS §19) |
| ☐ | Cieszewski, C.J., Bailey, R.L. 2000. Generalized algebraic difference approach… *Forest Science* 46: 116–126. | SQ-02 GADA | Diéguez-Aranda, U. ve ark. 2006. Dynamic growth model for Scots pine plantations in Galicia (north-western Spain). *Ecological Modelling* 191: 225–242; Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Baskerville, G.L. 1972. Use of logarithmic regression in the estimation of plant biomass. *Canadian Journal of Forest Research* 2: 49–53. (16 Kasım 2026: [A] karşılandı, aktaran Chave ve ark. 2014 *Global Change Biology* 20: 3177–3190 ve Baia ve ark. 2025 *PeerJ* 13: e18974, açık erişim, okundu; METHODS §22) | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☐ | Sprugel, D.G. **1983**. Correcting for bias in log-transformed allometric equations. *Ecology* 64: 209–210. | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☐ | Snowdon, P. 1991. A ratio estimator for bias correction in logarithmic regressions. *Canadian Journal of Forest Research* 21: 720–724. | BC-01 | Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381 |
| ☑ | Chave, J., Condit, R., Aguilar, S., Hernandez, A., Lao, S., Perez, R. 2004. Error propagation and scaling for tropical forest biomass estimates. *Philosophical Transactions of the Royal Society B* 359: 409–420. (17 Kasım 2026: kullanıcı yükledi, okundu; METHODS §22 BC04 [B]) | BC-06 (BC04) | Réjou-Méchain, M. ve ark. 2017. BIOMASS: an R package… *Methods in Ecology and Evolution* 8: 1163–1167 (17 Kasım 2026: kullanıcı yükledi, okundu, [B]); BIOMASS `AGBmonteCarlo` kaynak kodu okundu (rdrr.io) |
| ☑ | **Açık** — IPCC 2006. *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Cilt 4 Bölüm 2 ve 4; Cilt 1 Bölüm 3. ipcc-nggip.iges.or.jp (16 Kasım 2026: Cilt 4 Bölüm 2 Denklem 2.8 ve §2.2.3 okundu, METHODS §22 [B]) | BC-03…06 | gerekmez (ücretsiz) |

### B — modülüne gelince

**SV — gövde hacmi**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☑ | Kozak, A., Munro, D.D., Smith, J.H.G. 1969. Taper functions and their application in forest inventory. *The Forestry Chronicle* 45: 278–283. | SV-02 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Kozak 2004 |
| ☑ | Demaerschalk, J.P. 1972. Converting volume equations to compatible taper equations. *Forest Science* 18: 241–245. | SV-02 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☑ | Clutter, J.L. 1980. Development of taper functions from variable-top merchantable volume equations. *Forest Science* 26: 117–120. | SV-02/03 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☐ | Fang, Z., Borders, B.E., Bailey, R.L. 2000. Compatible volume–taper models… *Forest Science* 46: 1–12. | SV-02/03 | Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302 |
| ☐ | Schumacher, F.X., Hall, F.D.S. 1933. Logarithmic expression of timber-tree volume. *Journal of Agricultural Research* 47: 719–734. (USDA arşivinde ücretsiz olabilir) | SV-04 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Avery ve Burkhart 2002 |

**BC — biyokütle ve karbon**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☑ | Parresol, B.R. 1999. Assessing tree and stand biomass: a review with examples and critical comparisons. *Forest Science* 45: 573–593. (17 Kasım 2026: kullanıcı yükledi, okundu; METHODS §22 BC-02/a1 [B]; Tablo 4 sayısal referans) | BC-01/02 | yeni sayılır |
| ☐ | Parresol, B.R. 2001. Additivity of nonlinear biomass equations. *Canadian Journal of Forest Research* 31: 865–878. (17 Kasım 2026: klasörde yok; BC-02/a2 için gerekli) | BC-02, SM-04 | yeni sayılır |
| ☐ | Somogyi, Z. ve ark. 2007. Indirect methods of large-scale forest biomass estimation. *European Journal of Forest Research* 126: 197–207. | BC-03 | yeni sayılır |
| ☐ | Lehtonen, A. ve ark. 2004. Biomass expansion factors (BEFs)… *Forest Ecology and Management* 188: 211–224. | BC-03 | yeni sayılır |
| ☐ | **Açık** — IPCC 2019. *2019 Refinement…*, Cilt 4, Bölüm 4. | BC-03…05 | gerekmez |
| ☐ | **Açık** — JCGM 101:2008. *Supplement 1 to the GUM: Monte Carlo method.* bipm.org | BC-06 | gerekmez |

**SI — örnekleme ve envanter**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☐ | Gregoire, T.G., Valentine, H.T. 2008. *Sampling Strategies for Natural Resources and the Environment.* Chapman & Hall/CRC. (modülün ana kaynağı) | SI-02…09 | Mandallaz 2008 (aşağıda) |
| ☐ | Mandallaz, D. 2008. *Sampling Techniques for Forest Inventories.* Chapman & Hall/CRC. | SI-07, SI-08 | Gregoire ve Valentine 2008 (aşağıda, SI) |
| ☐ | Grosenbaugh, L.R. 1952. Plotless timber estimates — new, fast, easy. *Journal of Forestry* 50: 32–37. | SI-04 | Gregoire ve Valentine 2008 (aşağıda, SI); Kershaw ve ark. 2016 |
| ☐ | Gregoire, T.G. 1982. The unbiasedness of the mirage correction procedure for boundary overlap. *Forest Science* 28: 504–508. | SI-05 | Gregoire ve Valentine 2008 (aşağıda, SI) |
| ☐ | Ducey, M.J., Gove, J.H., Valentine, H.T. 2004. A walkthrough solution to the boundary overlap problem. *Forest Science* 50: 427–435. | SI-05 | Gregoire ve Valentine 2008 (aşağıda, SI) |
| ☐ | Warren, W.G., Olsen, P.F. 1964. A line intersect technique for assessing logging waste. *Forest Science* 10: 267–276. | SI-06 | Gregoire ve Valentine 2008 (aşağıda, SI) |
| ☐ | Van Wagner, C.E. 1968. The line intersect method in forest fuel sampling. *Forest Science* 14: 20–26. | SI-06 | Gregoire ve Valentine 2008 (aşağıda, SI) |
| ☑ | Beers, T.W. 1962. Components of forest growth. *Journal of Forestry* 60: 245–248. | SI-09 | Kershaw ve ark. 2016 (büyüme bileşenleri) |

**SM — istatistiksel modelleme** (algoritmalar kitap düzeyinde; paketler sayısal referans olur)

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☐ | Mehtätalo, L., Lappi, J. 2020. *Biometry for Forestry and Environmental Data.* Chapman & Hall/CRC. (`lmfor` bu kitabın paketi) | SM-02, SM-03 | yeni |
| ☐ | Pinheiro, J.C., Bates, D.M. 2000. *Mixed-Effects Models in S and S-PLUS.* Springer. | SM-03 | Mehtätalo ve Lappi 2020 |
| ☐ | Bates, D.M., Watts, D.G. 1988. *Nonlinear Regression Analysis and Its Applications.* Wiley. | SM-02 | Mehtätalo ve Lappi 2020 |
| ☐ | Efron, B., Tibshirani, R.J. 1993. *An Introduction to the Bootstrap.* Chapman & Hall. | SM-07 | Davison ve Hinkley 1997 (`boot` paketinin kitabı) |

**GY — büyüme ve hasılat**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☐ | Weiskittel, A.R., Hann, D.W., Kershaw, J.A., Vanclay, J.K. 2011. *Forest Growth and Yield Modeling.* Wiley-Blackwell. (modülün ana kaynağı) | GY-01…07 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer |
| ☐ | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer. (gövde profili, bonitet, rekabet, sıklık için de) | GY, SV, SQ, SS | Weiskittel ve ark. 2011 |
| ☐ | Usher, M.B. 1966. A matrix approach to the management of renewable resources… *Journal of Applied Ecology* 3: 355–367. | GY-02 | Weiskittel ve ark. 2011; Buongiorno ve Michie 1980 |
| ☑ | Buongiorno, J., Michie, B.R. 1980. A matrix model of uneven-aged forest management. *Forest Science* 26: 609–625. | GY-02 | Weiskittel ve ark. 2011 |
| ☑ | Wykoff, W.R. 1990. A basal area increment model for individual conifers in the northern Rocky Mountains. *Forest Science* 36: 1077–1104. | GY-03 | Weiskittel ve ark. 2011 |
| ☐ | Monserud, R.A., Sterba, H. 1996. A basal area increment model for individual trees… *Forest Ecology and Management* 80: 57–80. | GY-03 | Weiskittel ve ark. 2011 |
| ☐ | Monserud, R.A., Sterba, H. 1999. Modeling individual tree mortality for Austrian forest species. *Forest Ecology and Management* 113: 109–123. | GY-04 | Weiskittel ve ark. 2011 |
| ☑ | Drew, T.J., Flewelling, J.W. 1979. Stand density management… *Forest Science* 25: 518–532. | GY-06 | Newton 1997 (aşağıda) |
| ☐ | Newton, P.F. 1997. Stand density management diagrams: review… *Forest Ecology and Management* 98: 251–265. | GY-06 | yeni sayılır (derleme) |
| ☐ | Yoda, K., Kira, T., Ogawa, H., Hozumi, K. 1963. Self-thinning in overcrowded pure stands… *Journal of Biology, Osaka City University* 14: 107–129. | GY-07 | Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer; Weiskittel ve ark. 2011 |

**ML — mekânsal tahmin**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☐ | Cressie, N. 1993. *Statistics for Spatial Data*, gözden geçirilmiş baskı. Wiley. | ML-05 | Rasmussen ve Williams 2006 (**açık**, Gauss süreçleri); sayısal: `gstat` |
| ☐ | Moeur, M., Stage, A.R. 1995. Most similar neighbor… *Forest Science* 41: 337–359. | ML-04 | Crookston ve Finley 2008 (**açık**, Bölüm 2) |
| ☐ | Roberts, D.R. ve ark. 2017. Cross-validation strategies… *Ecography* 40: 913–929. | ML-06 | yeni; Ploton ve ark. 2020 (**açık**) |
| ☐ | Särndal, C.-E., Swensson, B., Wretman, J. 1992. *Model Assisted Survey Sampling.* Springer. | ML-08, SI-08 | Ståhl ve ark. 2016 (**açık**); Lumley 2004 (**açık**, `survey`) |

**DS — karar destek**

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☐ | Faustmann, M. 1849 (İngilizce çevirisi 1995). *Journal of Forest Economics* 1: 7–44. | DS-01 | çeviri yeni; Bettinger ve ark. 2017 |
| ☐ | Johnson, K.N., Scheurman, H.L. 1977. Techniques for prescribing optimal timber harvest… *Forest Science Monograph* 18. | DS-02 | Bettinger, P., Boston, K., Siry, J.P., Grebner, D.L. 2017. *Forest Management and Planning*, 2. baskı. Academic Press |
| ☐ | Harmon, M.E. ve ark. 1986. Ecology of coarse woody debris in temperate ecosystems. *Advances in Ecological Research* 15: 133–302. | DS-04 | Gregoire ve Valentine 2008 (aşağıda, SI) (hat kesişim hacmi) |
| ☐ | Nowak, D.J. ve ark. 2008. A ground-based method of assessing urban forest structure and ecosystem services. *Arboriculture & Urban Forestry* 34: 347–358. | DS-06 | yeni sayılır |

DS-05 (zarar değerlendirmesi) için kaynak, aracın kapsamı belirlenince seçilecek.

**TM — ağaç ölçümü** (ders kitabı düzeyi; biri yeter)

| ☐ | Kaynak | Araç | Yerine olur [A] |
|---|---|---|---|
| ☑ | Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. *Forest Mensuration*, 5. baskı. Wiley. (Drive'da tam kitap 15–17 MB, okuma aracı s. ~67'de kesiyor; 17 Kasım 2026 kullanıcının ayırdığı sayfalar okundu: s. 125–131 §5.5, 236–246 §8.6, 263–266 §8.9.3–8.9.5, Ek A.2–A.3; s. 160–200 §6.4.1, §7.4.1, §7.4.3 → SV-03 [B]; 17 Kasım 2026: kitap kullanıcı tarafından 7 parçaya bölündü, 2. parça §6.2 s. 156–159 → SV-04 [B]) | TM-01…06, SS-02 (CCF), SV-03, SV-04 | van Laar ve Akça 2007; Avery ve Burkhart 2002 |
| ☑ | Hamilton, G.J. 1975. *Forest Mensuration Handbook.* Forestry Commission Booklet 39. HMSO. (17 Kasım 2026 yüklendi; METHODS §23) | TM | — |
| ☑ | Graves, H.S. 1906. *Forest Mensuration.* Wiley. (17 Kasım 2026 yüklendi; kamu malı; METHODS §23) | TM | — |
| ☑ | C — van Laar, A., Akça, A. 2007. *Forest Mensuration*, 2. baskı. Springer. (17 Kasım 2026 yüklendi; okuma aracı PDF'in ilk 163 sayfasını veriyor, 9. bölüm ve sonrası okunamadı) | TM | Kershaw ve ark. 2016 |
| ☐ | C — Avery, T.E., Burkhart, H.E. 2002. *Forest Measurements*, 5. baskı. McGraw-Hill. (SV-05 tomruk kuralları) | TM, SV-05 | Kershaw ve ark. 2016 |
| ☐ | C — Kalıpsız, A. *Dendrometri.* İÜ Orman Fakültesi (elindeki baskı). Türkçe terimler için. | TM | — |

### Aktarma için anahtar kaynaklar (önce bunları indir)

Yukarıdaki "yerine olur" önerilerinin çoğu bu beş kaynağa dayanır; ellerindeyse eski makalelerin çoğuna gerek kalmaz:

- ☐ Burkhart, H.E., Tomé, M. 2012. *Modeling Forest Trees and Stands.* Springer. (SV, SQ, SS, GY)
- ☐ Weiskittel, A.R., Hann, D.W., Kershaw, J.A., Vanclay, J.K. 2011. *Forest Growth and Yield Modeling.* Wiley-Blackwell. (GY, SS)
- ☐ Gregoire, T.G., Valentine, H.T. 2008. *Sampling Strategies for Natural Resources and the Environment.* Chapman & Hall/CRC. (SI, DS-04)
- ☐ Pommerening, A., Grabarnik, P. 2019. *Individual-based Methods in Forest Ecology and Management.* Springer. (SS-05, SS-06, SS-07)
- ☐ Li, R., Weiskittel, A.R. 2010. Comparison of model forms for estimating stem taper and volume in the primary conifer species of the North American Acadian Region. *Annals of Forest Science* 67: 302. (SV-02)
- ☑ Clifford, D., Cressie, N., England, J.R., Roxburgh, S.H., Paul, K.I. 2013. Correction factors for unbiased, efficient estimation and prediction of biomass from log–log allometric models. *Forest Ecology and Management* 310: 375–381. (BC-01)
- ☑ Contreras, M.A., Affleck, D., Chung, W. 2011. Evaluating tree competition indices as predictors of basal area increment in western Montana forests. *Forest Ecology and Management* 262: 1939–1949. (SS-07 Hegyi; `siplab` ile birlikte [A] koşulunu karşılar)

---

## Bölüm 2. Paket yeterli ([P] adayları)

PDF gerekmez. Her satırda: araç kimliği, paket ve işlev, paketin verdiği (**formül** = yardım sayfası denklemi açıkça
yazıyor; **sayısal** = yalnız test referansı), paketi tanıtan yayın (çoğu **açık**). İşlev uygulanmadan önce yardım
sayfası okunur ve METHODS'ta [P] ile işaretlenir; belirsiz bir yazım çıkarsa (aşağıdaki Chapman–Richards notu) paketin
kodu ve sayısal çıktısıyla netleştirilir, yine belirsizse PDF'e dönülür.

| Araç | Paket ve işlev | Verdiği | Özgün kaynak (künye; PDF gerekmez) | Paketin yayını |
|---|---|---|---|---|
| SS-07 Hegyi | `siplab` 1.6: `pairwise(kernel = powers_ker)` | formül: (S_j/S_i)/R, p_i = p_j = p_r = 1; özgün Hegyi'nin uzaklığa 1 ft eklediği notu | Hegyi 1974 ([A]: Contreras ve ark. 2011 ile) | García, O. 2014. siplab, a spatial individual-based plant modelling system. *Computational Ecology and Software* 4(4): 215–222. **Açık** |
| SS-06 Ripley K, L | `spatstat.explore` 3.8-3: `Kest`, `Lest` | formül + kenar düzeltmeleri | Ripley 1976, 1977; Besag 1977 | Baddeley, A., Turner, R. 2005. spatstat: an R package for analyzing spatial point patterns. *J. Statistical Software* 12(6). **Açık** |
| SS-06 çift korelasyon | `spatstat.explore`: `pcf` | formül (çekirdek kestirimi) | Stoyan ve Stoyan 1994; Illian ve ark. 2008 | aynı |
| SS-04 çeşitlilik (ek doğrulama) | `vegan` 2.7-6: `diversity` | formül | Shannon, Simpson | — |
| SQ-03 büyüme işlevleri | `growthmodels` 1.3.1: `chapmanRichards`, `gompertz`, `richard`, `schnute`, `weibull`, `vonBertalanffy`… | formül (dikkat: Chapman–Richards sayfasındaki yazımda parantez belirsiz; kod ve sayısal çıktıyla netleştirilecek) | Richards 1959; Chapman 1961; Gompertz 1825; Schumacher 1939 | paketin gösterdiği kaynak: Fekedulegn, D., Mac Siurtain, M., Colbert, J. 1999. Parameter estimation of nonlinear growth models in forestry. *Silva Fennica* 33(4): 327–336. **Açık** |
| SM-04 SUR | `systemfit` 1.1-30 | formül + sayısal | Zellner 1962 | Henningsen, A., Hamann, J.D. 2007. systemfit: a package for estimating systems of simultaneous equations in R. *J. Statistical Software* 23(4). **Açık** |
| SM-03 karma modeller | `nlme` 3.1, `lme4` 2.1 | sayısal (yöntem için Bölüm 1'deki kitaplar) | Lindstrom ve Bates 1990 | Bates, D., Mächler, M., Bolker, B., Walker, S. 2015. Fitting linear mixed-effects models using lme4. *J. Statistical Software* 67(1). **Açık** |
| SM-01/03 boy–çap | `lmfor` 1.7 | formül (zaten [B] olarak kullanıldı, 9 Kasım) | Mehtätalo ve ark. 2015 | Mehtätalo ve Lappi 2020 (Bölüm 1) |
| SM-05 sağkalım | `survival` 3.8 | sayısal | Cox 1972 | — |
| SM-07 bootstrap | `boot` 1.3 | sayısal | Efron ve Tibshirani 1993 | Davison ve Hinkley 1997 (paketin kitabı) |
| SI-02, SI-03 tasarımlar | `forestmangr` 0.9: `sprs`, `strs`, `ss_diffs` | sayısal | Kershaw ve ark. 2016 | — |
| SI-08 Horvitz–Thompson, GREG | `survey` 4.5: `svytotal`, `calibrate` | formül + sayısal | Horvitz ve Thompson 1952; Särndal ve ark. 1992 | Lumley, T. 2004. Analysis of complex survey samples. *J. Statistical Software* 9(8). **Açık** |
| ML-07 küçük alan | `sae` 1.4: `eblupFH`, `eblupBHF` | formül + sayısal | Fay ve Herriot 1979; Battese, Harter ve Fuller 1988 | Molina, I., Marhuenda, Y. 2015. sae: an R package for small area estimation. *The R Journal* 7(1): 81–98. **Açık** |
| ML-01 rastgele orman | `ranger` 0.18 | sayısal (rastgelelik nedeniyle dağılım düzeyinde) | Breiman 2001 | Wright, M.N., Ziegler, A. 2017. ranger: a fast implementation of random forests for high dimensional data in C++ and R. *J. Statistical Software* 77(1). **Açık** |
| ML-04 k-NN atama | `yaImpute` 1.0 | formül + sayısal | Moeur ve Stage 1995 | Crookston, N.L., Finley, A.O. 2008. yaImpute: an R package for kNN imputation. *J. Statistical Software* 23(10). **Açık** |
| ML-05 kriging | `gstat` 2.1 | sayısal (yöntem: Cressie, Bölüm 1) | Matheron; Cressie 1993 | Pebesma, E.J. 2004. Multivariable geostatistics in S: the gstat package. *Computers & Geosciences* 30: 683–691. |
| DS-02 doğrusal programlama | `lpSolve` 5.6 | sayısal (çözücü) | — | — |
| BC-01 tropik biyokütle (yalnız test) | `BIOMASS` 2.2: `computeAGB`, `AGBmonteCarlo` | formül + sayısal; paketin odun yoğunluğu ve katsayıları **gömülmez** (K1) | Chave ve ark. 2014 | Réjou-Méchain, M. ve ark. 2017. BIOMASS: an R package for estimating above-ground biomass and its uncertainty in tropical forests. *Methods in Ecology and Evolution* 8: 1163–1167. |
| SV-02 B-spline gövde profili (isteğe bağlı ek model) | `TapeR` 0.5 | sayısal | Kublin, E., Breidenbach, J., Kändler, G. 2013. A flexible stem taper and volume prediction method based on mixed-effects B-spline regression. *European Journal of Forest Research* 132: 983–997. | — |

Bölüm 2 ile Bölüm 1'den düşenler (artık PDF aranmaz): Hegyi 1974; Ripley 1976, 1977; Illian ve ark. 2008;
Richards 1959; Chapman 1961; Schumacher 1939; Zeide 1993; Zellner 1962; Borders 1989; Cox 1972; Davison ve Hinkley
1997; Horvitz ve Thompson 1952; Cochran 1977 (tasarım formülleri için `survey`/`forestmangr`); Fay ve Herriot 1979;
Battese ve ark. 1988; Rao ve Molina 2015; Breiman 2001; Hastie ve ark. 2009; Crookston ve Finley 2008; Rasmussen ve
Williams 2006 (kriging `gstat` ile); Ploton ve ark. 2020; Ståhl ve ark. 2016 (açık erişim; istenirse okunur); Chave ve
ark. 2014; Jenkins ve ark. 2003; Zianis ve ark. 2005; Tolunay 2011; Thomas ve Martin 2012 (karbon oranı zaten
kullanıcıdan); Bitterlich 1984; de Vries 1986; Schreuder ve ark. 1993; Ware ve Cunia 1962; Vanclay 1994; Clutter ve
ark. 1983; Pretzsch 2009; Bettinger ve ark. 2017; West 2009; Calama ve Montero 2004; Marquardt 1963.

---

## Bölüm 3. Mevcut araçların doğrulama borcu (C; METHODS.md'de [D])

Yayındaki hesaplar bağımsız sayısal referansla zaten test edildi; bunlar künye ve tanım doğrulaması için. Çoğu
[P] ile kapatılabilir: çap dağılımları `fitdistrplus` (Delignette-Muller, M.L., Dutang, C. 2015. *J. Statistical
Software* 64(4), **açık**), `lmomco`, `ForestFit`; uyum testleri ve AIC `stats`/`fitdistrplus`.

- Johnson 1949 (Johnson SB; `ForestFit`), Burk ve Newberry 1984 (moment geri kazanımı), Knoebel ve Burkhart 1991,
  Cohen 1965, Anderson ve Darling 1954, Massey 1951, Akaike 1974, Hyndman ve Fan 1996 (R `quantile` type 7 belgesi
  yeter), Näslund 1936 (`lmfor` [B] ile karşılandı), Assmann 1970 (üst boy tanımı; ders kitabı).
