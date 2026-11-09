# forestbiometry.online: çalışma kuralları

Önce oku: `docs/PROJECT.md` (mimari, veri sözleşmesi, kurallar), `docs/METHODS.md` (formüller, kaynaklar), `docs/PROGRESS.md` (durum, sıradaki adım).

- Platform: bağımsız **Ormancılık Biyometrisi Araçları / Forest Biometrics Tools**; yazar ve sorumlu Onur Alkan (9 Kasım 2026, kullanıcı kararı). Eski onuralkan.com.tr kişisel sitesi (gazete, admin, 2FA, yayınlar, notlar, bulmaca) kapatıldı; geri getirilmez. Son hâli `8a002d2` commit'inde.
- Kullanıcı modülleri sırayla gönderir; bir turda yalnızca gönderilen modül uygulanır, tamamlanmış modüller yeniden yazılmaz.
- TR/EN eksiksiz; hesap (`calc.js`) arayüzden ayrı; veri/katsayı/kaynak uydurulmaz (ORCID gibi kişisel bilgiler dahil); kaynak durumu METHODS.md'de [B]/[İ]/[D] ile işaretlenir.
- Her bilimsel hesap bağımsız referansla test edilir: `node tests/<araç>/test_*.mjs`, eski kod için `node legacy/test_math.js` (referanslar `tests/ref/`); tarayıcı testleri `tests/*/e2e.mjs` (`php -S` ile).
- PHP 7.4 uyumlu kal (8.x'te de çalışmalı). Veritabanı yok, sunucuda kullanıcı verisi yok. Araçlarda veri tarayıcıdan çıkmaz.
- `data/`, `files/` ve hiçbir sır (API anahtarı vb.) commit edilmez.
- Yayın: `main` dalına her push, GitHub Actions ile sayısal testlerden sonra cPanel API'si üzerinden HTTPS ile (2083) forestbiometry.online köküne yüklenir (`.github/deploy-cpanel.sh`, `.github/workflows/deploy.yml`). Sunucu bilgileri (`CP_HOST`, `CP_USER`, `DIR`) iş akışında; boşken yükleme atlanır. Push = canlıya çıkış; push etmeden önce testleri çalıştır. Sunucuda hiçbir şey silinmez. Yedek yol: `scripts/build-zip.sh` + cPanel.
- Her modül sonunda PROGRESS.md (ve gerekirse METHODS.md) güncellenir, ayrı commit atılır.
