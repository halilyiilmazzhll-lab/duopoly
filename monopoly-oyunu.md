# Web Monopoly Oyunu - Araştırma & Plan

## Amaç
Aile ile birlikte oynanabilecek, tarayıcı tabanlı çok oyunculu bir Monopoly oyunu geliştirmek.

---

## Monopoly Mekanikleri Araştırma Sonuçları

### 1. Tahta Düzeni (40 Kare)

Tahta saat yönünde 4 kenardan oluşur, toplam 40 kare:

| # | Kare | Tür |
|---|------|-----|
| 0 | **BAŞLA (GO)** | Köşe - Geçerken $200 al |
| 1 | Mediterranean Avenue | Kahverengi arsa |
| 2 | Topluluk Sandığı | Kart |
| 3 | Baltic Avenue | Kahverengi arsa |
| 4 | Gelir Vergisi ($200) | Vergi |
| 5 | Reading Demiryolu | Demiryolu |
| 6 | Oriental Avenue | Açık Mavi arsa |
| 7 | Şans | Kart |
| 8 | Vermont Avenue | Açık Mavi arsa |
| 9 | Connecticut Avenue | Açık Mavi arsa |
| 10 | **HAPİSHANE / Ziyaret** | Köşe |
| 11 | St. Charles Place | Pembe arsa |
| 12 | Elektrik Şirketi | Altyapı |
| 13 | States Avenue | Pembe arsa |
| 14 | Virginia Avenue | Pembe arsa |
| 15 | Pennsylvania Demiryolu | Demiryolu |
| 16 | St. James Place | Turuncu arsa |
| 17 | Topluluk Sandığı | Kart |
| 18 | Tennessee Avenue | Turuncu arsa |
| 19 | New York Avenue | Turuncu arsa |
| 20 | **BEDAVA PARK** | Köşe |
| 21 | Kentucky Avenue | Kırmızı arsa |
| 22 | Şans | Kart |
| 23 | Indiana Avenue | Kırmızı arsa |
| 24 | Illinois Avenue | Kırmızı arsa |
| 25 | B.&O. Demiryolu | Demiryolu |
| 26 | Atlantic Avenue | Sarı arsa |
| 27 | Ventnor Avenue | Sarı arsa |
| 28 | Su Şirketi | Altyapı |
| 29 | Marvin Gardens | Sarı arsa |
| 30 | **HAPİSHANEYE GİT** | Köşe |
| 31 | Pacific Avenue | Yeşil arsa |
| 32 | North Carolina Avenue | Yeşil arsa |
| 33 | Topluluk Sandığı | Kart |
| 34 | Pennsylvania Avenue | Yeşil arsa |
| 35 | Short Line Demiryolu | Demiryolu |
| 36 | Şans | Kart |
| 37 | Park Place | Koyu Mavi arsa |
| 38 | Lüks Vergisi ($100) | Vergi |
| 39 | Boardwalk | Koyu Mavi arsa |

---

### 2. Arsa Fiyatları ve Kiralar

| Arsa | Renk | Fiyat | İpotek | Ev Maliyeti | Boş Kira | 1 Ev | 2 Ev | 3 Ev | 4 Ev | Otel |
|------|------|-------|--------|-------------|----------|------|------|------|------|------|
| Mediterranean | Kahverengi | $60 | $30 | $50 | $2 | $10 | $30 | $90 | $160 | $250 |
| Baltic | Kahverengi | $60 | $30 | $50 | $4 | $20 | $60 | $180 | $320 | $450 |
| Oriental | Açık Mavi | $100 | $50 | $50 | $6 | $30 | $90 | $270 | $400 | $550 |
| Vermont | Açık Mavi | $100 | $50 | $50 | $6 | $30 | $90 | $270 | $400 | $550 |
| Connecticut | Açık Mavi | $120 | $60 | $50 | $8 | $40 | $100 | $300 | $450 | $600 |
| St. Charles | Pembe | $140 | $70 | $100 | $10 | $50 | $150 | $450 | $625 | $750 |
| States | Pembe | $140 | $70 | $100 | $10 | $50 | $150 | $450 | $625 | $750 |
| Virginia | Pembe | $160 | $80 | $100 | $12 | $60 | $180 | $500 | $700 | $900 |
| St. James | Turuncu | $180 | $90 | $100 | $14 | $70 | $200 | $550 | $750 | $950 |
| Tennessee | Turuncu | $180 | $90 | $100 | $14 | $70 | $200 | $550 | $750 | $950 |
| New York | Turuncu | $200 | $100 | $100 | $16 | $80 | $220 | $600 | $800 | $1000 |
| Kentucky | Kırmızı | $220 | $110 | $150 | $18 | $90 | $250 | $700 | $875 | $1050 |
| Indiana | Kırmızı | $220 | $110 | $150 | $18 | $90 | $250 | $700 | $875 | $1050 |
| Illinois | Kırmızı | $240 | $120 | $150 | $20 | $100 | $300 | $750 | $925 | $1100 |
| Atlantic | Sarı | $260 | $130 | $150 | $22 | $110 | $330 | $800 | $975 | $1150 |
| Ventnor | Sarı | $260 | $130 | $150 | $22 | $110 | $330 | $800 | $975 | $1150 |
| Marvin Gardens | Sarı | $280 | $140 | $150 | $24 | $120 | $360 | $850 | $1025 | $1200 |
| Pacific | Yeşil | $300 | $150 | $200 | $26 | $130 | $390 | $900 | $1100 | $1275 |
| North Carolina | Yeşil | $300 | $150 | $200 | $26 | $130 | $390 | $900 | $1100 | $1275 |
| Pennsylvania | Yeşil | $320 | $160 | $200 | $28 | $150 | $450 | $1000 | $1200 | $1400 |
| Park Place | Koyu Mavi | $350 | $175 | $200 | $35 | $175 | $500 | $1100 | $1300 | $1500 |
| Boardwalk | Koyu Mavi | $400 | $200 | $200 | $50 | $200 | $600 | $1400 | $1700 | $2000 |

**Demiryolları** (her biri $200, ipotek $100):
- 1 demiryolu: $25 kira
- 2 demiryolu: $50 kira
- 3 demiryolu: $100 kira
- 4 demiryolu: $200 kira

**Altyapılar** (her biri $150, ipotek $75):
- 1 altyapı: Zar × 4
- 2 altyapı: Zar × 10

---

### 3. Temel Kurallar

**Başlangıç:**
- Her oyuncu $1500 ile başlar (2×$500, 2×$100, 2×$50, 6×$20, 5×$10, 5×$5, 5×$1)
- 2-8 oyuncu
- Herkes BAŞLA karesinden başlar

**Tur Akışı:**
1. Zar at (2 zar)
2. Saat yönünde hareket et
3. Düştüğün kareye göre işlem yap
4. Çift gelirse tekrar at (3 kez çift = hapishane)

**Arsa Satın Alma:**
- Boş arsaya düşen oyuncu satın alabilir
- Almayı reddederse **açık artırma** yapılır (herkes katılabilir)

**Ev/Otel İnşaatı:**
- Aynı renk grubunun tamamına sahip olmalısın (tekel)
- Evler eşit dağıtılmalı (fark max 1)
- Maksimum 4 ev → sonra otele yükselt
- İpotekli arsası olan grupta bina yapılamaz

**Tekel (Monopoly) Bonusu:**
- Aynı renk grubundaki tüm arsalara sahipsen, boş arsalarda kira **2 katına** çıkar

---

### 4. Hapishane Mekaniği

**Hapishaneye girme yolları:**
- "Hapishaneye Git" karesine düşmek
- Şans/Topluluk Sandığı kartı
- Üst üste 3 kez çift atmak

**Hapishaneden çıkış:**
- $50 ceza ödemek
- "Hapishaneden Çık" kartı kullanmak
- Çift atmaya çalışmak (3 tur hakkı, başarısızlıkta $50 ödeme zorunlu)

**Hapishanedeyken:**
- Kira toplayabilir, bina yapabilir, takas edebilir, açık artırmaya katılabilir

---

### 5. İpotek Sistemi

- Binasız arsa ipoteklenebilir → Tapu kartındaki ipotek değeri alınır (fiyatın yarısı)
- İpotekli arsadan kira alınamaz
- İpoteği kaldırmak: İpotek değeri + %10 faiz
- Binalı arsa ipoteklenmeden önce, o gruptaki TÜM binalar yarı fiyata bankaya satılmalı

---

### 6. Şans Kartları (16 adet)

1. Boardwalk'a ilerle
2. BAŞLA'ya ilerle ($200 al)
3. Illinois Avenue'ya ilerle (GO geçersen $200)
4. St. Charles Place'e ilerle (GO geçersen $200)
5. En yakın Demiryoluna ilerle (sahibiyse 2x kira öde)
6. En yakın Demiryoluna ilerle (sahibiyse 2x kira öde) *(2 tane)*
7. En yakın Altyapıya ilerle (sahibiyse zar×10 öde)
8. Banka temettü: $50 al
9. Hapishaneden Çık kartı
10. 3 kare geri git
11. Hapishaneye Git
12. Genel tamir: Her ev $25, her otel $100 öde
13. Hız cezası: $15 öde
14. Reading Demiryoluna git (GO geçersen $200)
15. Yönetim kurulu başkanı seçildin: Her oyuncuya $50 öde
16. Bina kredin olgunlaştı: $150 al

---

### 7. Topluluk Sandığı Kartları (16 adet)

1. BAŞLA'ya ilerle ($200 al)
2. Banka hatası: $200 al
3. Doktor ücreti: $50 öde
4. Hisse senedi satışı: $50 al
5. Hapishaneden Çık kartı
6. Hapishaneye Git
7. Tatil fonu: $100 al
8. Gelir vergisi iadesi: $20 al
9. Doğum günün! Her oyuncudan $10 al
10. Hayat sigortası: $100 al
11. Hastane ücreti: $100 öde
12. Okul ücreti: $50 öde
13. Danışmanlık ücreti: $25 al
14. Sokak tamiri: Her ev $40, her otel $115 öde
15. Güzellik yarışması 2.'si: $10 al
16. Miras: $100 al

---

### 8. İflas ve Oyun Sonu

- Ödeyemeyeceğin borç varsa → iflâs
- İflâs eden oyuncunun varlıkları alacaklıya geçer
- Bankaya iflâs ederse varlıklar açık artırmaya çıkar
- Son kalan oyuncu kazanır

---

## Geliştirme Planı (Taslak)

> [!IMPORTANT]
> Bu plan henüz taslak aşamasında. Teknoloji seçimi ve detaylı implementasyon planı için onayınız gerekiyor.

### Sorular

1. **Çok oyunculu mod:** Aynı bilgisayarda sırayla mı oynamak istiyorsunuz (hot-seat), yoksa farklı cihazlardan aynı anda mı (online multiplayer)?
2. **Tahta teması:** Klasik Monopoly teması mı, yoksa özel bir tema (Türk şehirleri, aile isimleri vb.) mı?
3. **Ek özellikler:** Takas/ticaret sistemi, AI oyuncu, hızlı oyun modu gibi özellikler ister misiniz?
4. **Teknoloji tercihi:** Vanilla HTML/CSS/JS mi, yoksa React/Vite gibi bir framework mı?

## Yapılacaklar

- [ ] Kullanıcı sorularına yanıt al
- [ ] Detaylı implementasyon planı oluştur
- [ ] Tahta UI tasarımı
- [ ] Oyun motoru (state management)
- [ ] Çok oyunculu altyapı
- [ ] Şans/Topluluk kartları sistemi
- [ ] Ev/otel inşaat UI
- [ ] İpotek/ticaret UI
- [ ] Test ve doğrulama
