# onuralkan.com.tr: çalışma kuralları

Önce oku: `docs/PROJECT.md` (mimari, veri sözleşmesi, kurallar), `docs/METHODS.md` (formüller, kaynaklar), `docs/PROGRESS.md` (durum, sıradaki adım).

- Kullanıcı modülleri sırayla gönderir; bir turda yalnızca gönderilen modül uygulanır, tamamlanmış modüller yeniden yazılmaz.
- TR/EN eksiksiz; hesap (`calc.js`) arayüzden ayrı; veri/katsayı/kaynak uydurulmaz; kaynak durumu METHODS.md'de [B]/[İ]/[D] ile işaretlenir.
- Her bilimsel hesap bağımsız referansla test edilir: `node tests/test_math.js` (referanslar `tests/ref/`).
- PHP 7.4 uyumlu kal (sunucu 7.4.33). Veritabanı yok. Araçlarda veri tarayıcıdan çıkmaz.
- `data/` ve `files/` içeriği (kullanıcı verisi, şifre özeti, 2FA anahtarı) asla commit edilmez.
- Yayın (5 Kasım 2026, kullanıcı kararı): `main` dalına her push, GitHub Actions ile sayısal testlerden sonra SSH (rsync/tar) ile sunucuya yüklenir (`.github/workflows/deploy.yml`). Yani push = canlıya çıkış; push etmeden önce testleri çalıştır. `data/` ve `files/` hiçbir zaman yüklenmez ve silinmez. Yedek yol: `scripts/build-zip.sh` + cPanel.
- Her modül sonunda PROGRESS.md (ve gerekirse METHODS.md) güncellenir, ayrı commit atılır.
