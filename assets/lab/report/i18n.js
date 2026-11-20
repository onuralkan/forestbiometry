// Report generator (DI-05): TR/EN interface texts (the report's own words are in render.js).
import { makeT } from '../core/i18n.js';

export const T = makeT({
  tr: {
    privacy: 'Rapor bu tarayıcıda hazırlanır; paket, kayıtlar ve notlar sunucuya gönderilmez.',
    'm.h': 'Rapor bilgileri', 'm.title': 'Başlık', 'm.author': 'Hazırlayan', 'm.org': 'Kurum', 'm.date': 'Tarih', 'm.intro': 'Giriş metni', 'm.lang': 'Rapor dili', 'm.tr': 'Türkçe', 'm.en': 'İngilizce',
    'p.h': 'Veri paketi', 'p.pick': 'Paket', 'p.none': '(paket yok)', 'p.sample': 'Örnek paket (benzetim verisi)', 'p.empty': 'Envanter Verisi Yöneticisi\'nde paket yok; rapor yalnızca kayıtlardan da hazırlanabilir.',
    'p.samplenote': 'Raporda örnek paket (benzetim verisi) kullanılıyor (yalnızca deneme için).',
    'f.period': 'Dönem', 'f.stratum': 'Tabaka', 'f.species': 'Tür', 'f.plot': 'Örnek alan', 'f.all': 'hepsi', 'f.noper': 'dönemsiz', 'f.nosp': 'tür yok',
    'f.width': 'Çap sınıfı genişliği (cm)', 'f.auto': 'otomatik', 'f.ec': 'Kaydı olmayan örnek alan × dönem', 'f.ec.unmeasured': 'ölçülmedi', 'f.ec.empty': 'boş (N = G = 0)',
    'r.h': 'Çalışma kayıtları', 'r.file': 'Kayıt ekle (.json)', 'r.pano': "Veri Görselleştirme'deki kayıtları al", 'r.none': 'Kayıt eklenmedi.', 'r.bad': p => `${p.f}: çalışma kaydı değil.`, 'r.read': p => `${p.f}: JSON olarak okunamadı.`,
    'r.rm': 'Kaldır', 'r.up': 'Yukarı', 'r.got': p => `Veri Görselleştirme'den ${p.n} kayıt alındı.`,
    's.h': 'Bölümler ve notlar', 's.package': 'Veri paketi', 's.charts': 'Grafikler', 's.records': 'Çalışma kayıtları', 's.sources': 'Kaynaklar', 's.repro': 'Ek: Tekrarlanabilirlik', 's.note': 'Not',
    print: 'Yazdır / PDF olarak kaydet', html: 'HTML indir', 'print.note': 'PDF için yazdırma penceresinde hedef olarak "PDF olarak kaydet"i seçin. Grafikler ve tablolar A4 sayfaya göre dizilir.',
    preview: 'Önizleme',
  },
  en: {
    privacy: 'The report is prepared in this browser; the package, records and notes are not sent to the server.',
    'm.h': 'Report details', 'm.title': 'Title', 'm.author': 'Prepared by', 'm.org': 'Institution', 'm.date': 'Date', 'm.intro': 'Introduction', 'm.lang': 'Report language', 'm.tr': 'Turkish', 'm.en': 'English',
    'p.h': 'Data package', 'p.pick': 'Package', 'p.none': '(no package)', 'p.sample': 'Sample package (simulated data)', 'p.empty': 'No packages in the Inventory Data Manager; a report can also be made from records alone.',
    'p.samplenote': 'The report uses the simulated sample package (for trying out only).',
    'f.period': 'Period', 'f.stratum': 'Stratum', 'f.species': 'Species', 'f.plot': 'Plot', 'f.all': 'all', 'f.noper': 'no period', 'f.nosp': 'no species',
    'f.width': 'Diameter class width (cm)', 'f.auto': 'automatic', 'f.ec': 'Plot × period without records', 'f.ec.unmeasured': 'not measured', 'f.ec.empty': 'empty (N = G = 0)',
    'r.h': 'Run records', 'r.file': 'Add records (.json)', 'r.pano': "Take the records from Data Visualization", 'r.none': 'No records added.', 'r.bad': p => `${p.f}: not a run record.`, 'r.read': p => `${p.f}: could not be read as JSON.`,
    'r.rm': 'Remove', 'r.up': 'Up', 'r.got': p => `${p.n} record(s) taken from Data Visualization.`,
    's.h': 'Sections and notes', 's.package': 'Data package', 's.charts': 'Charts', 's.records': 'Run records', 's.sources': 'References', 's.repro': 'Appendix: Reproducibility', 's.note': 'Note',
    print: 'Print / save as PDF', html: 'Download HTML', 'print.note': 'For a PDF, choose "Save as PDF" as the destination in the print dialog. Charts and tables are laid out for A4 pages.',
    preview: 'Preview',
  },
});
