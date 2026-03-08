const chance = [
    { text: "İstanbul'a ilerle!", effect: "move_to", target: 39 },
    { text: "BAŞLA'ya ilerle! (₺200 al)", effect: "move_to", target: 0 },
    { text: "Adana'ya ilerle! GO geçersen ₺200 al.", effect: "move_to", target: 24 },
    { text: "Şırnak'a ilerle! GO geçersen ₺200 al.", effect: "move_to", target: 11 },
    { text: "En yakın Demiryoluna ilerle. Sahibi varsa 2x kira öde.", effect: "nearest_railroad" },
    { text: "En yakın Demiryoluna ilerle. Sahibi varsa 2x kira öde.", effect: "nearest_railroad" },
    { text: "En yakın Altyapıya ilerle. Sahibi varsa zar×10 öde.", effect: "nearest_utility" },
    { text: "Banka temettüsü! ₺50 al.", effect: "collect", amount: 50 },
    { text: "Hapishaneden Çık kartı! Saklayabilirsiniz.", effect: "jail_free" },
    { text: "3 kare geri git!", effect: "move_back", steps: 3 },
    { text: "Hapishaneye Git! GO'dan geçme, ₺200 alma.", effect: "go_to_jail" },
    { text: "Genel tamir: Her ev için ₺25, her otel için ₺100 öde.", effect: "repairs", perHouse: 25, perHotel: 100 },
    { text: "Hız cezası! ₺15 öde.", effect: "pay", amount: 15 },
    { text: "Doğu Ekspresi'ne git! GO geçersen ₺200 al.", effect: "move_to", target: 5 },
    { text: "Yönetim kurulu başkanı seçildin! Her oyuncuya ₺50 öde.", effect: "pay_each", amount: 50 },
    { text: "Bina kredin olgunlaştı! ₺150 al.", effect: "collect", amount: 150 },
];

const community = [
    { text: "BAŞLA'ya ilerle! (₺200 al)", effect: "move_to", target: 0 },
    { text: "Banka hatası lehinize! ₺200 alın.", effect: "collect", amount: 200 },
    { text: "Doktor ücreti. ₺50 ödeyin.", effect: "pay", amount: 50 },
    { text: "Hisse senedi satışından ₺50 kazandınız.", effect: "collect", amount: 50 },
    { text: "Hapishaneden Çık kartı! Saklayabilirsiniz.", effect: "jail_free" },
    { text: "Hapishaneye Git! GO'dan geçme, ₺200 alma.", effect: "go_to_jail" },
    { text: "Tatil fonunuz olgunlaştı! ₺100 alın.", effect: "collect", amount: 100 },
    { text: "Gelir vergisi iadesi! ₺20 alın.", effect: "collect", amount: 20 },
    { text: "Doğum gününüz kutlu olsun! Her oyuncudan ₺10 alın.", effect: "collect_from_each", amount: 10 },
    { text: "Hayat sigortanız olgunlaştı! ₺100 alın.", effect: "collect", amount: 100 },
    { text: "Hastane masrafı. ₺100 ödeyin.", effect: "pay", amount: 100 },
    { text: "Okul ücreti. ₺50 ödeyin.", effect: "pay", amount: 50 },
    { text: "Danışmanlık ücreti! ₺25 alın.", effect: "collect", amount: 25 },
    { text: "Yol tamiri: Her ev için ₺40, her otel için ₺115 öde.", effect: "repairs", perHouse: 40, perHotel: 115 },
    { text: "Güzellik yarışmasında 2. oldunuz! ₺10 alın.", effect: "collect", amount: 10 },
    { text: "Miras kaldı! ₺100 alın.", effect: "collect", amount: 100 },
];

module.exports = { chance, community };
