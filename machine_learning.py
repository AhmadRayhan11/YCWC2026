import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Dataset Komprehensif untuk Health Companion Lansia
# Format: (Teks Kalimat Bebas, Urgency Label, Disease Label)
# Urgency: 0 (Rendah / Normal), 1 (Sedang / Perlu Perhatian), 2 (Tinggi / Darurat Medis)
# Disease: 
#   0: Normal / Stabil
#   1: Indikasi Trauma / Cedera Fisik
#   2: Indikasi Kardiovaskular / Masalah Jantung & Darah
#   3: Indikasi Masalah Pernapasan (Respirasi)
#   4: Gangguan Sistem Pencernaan (Gastrointestinal)
#   5: Indikasi Infeksi / Demam (Pyrexia)
#   6: Indikasi Gangguan Neurologis / Saraf
#   7: Masalah Otot & Sendi (Muskuloskeletal)

data = [
    # --- 0: NORMAL / STABIL ---
    ("Kakek tidur nyenyak semalaman dan minum obat rutin", 0, 0),
    ("Hari ini ibu makan dengan lahap dan jalan-jalan di taman", 0, 0),
    ("Kondisi stabil, tidak ada keluhan sama sekali hari ini", 0, 0),
    ("Bapak menonton TV dengan ceria dan tekanan darah normal", 0, 0),
    ("Tidak ada gejala aneh, lansia merasa segar bugar", 0, 0),
    ("Nenek minum air putih cukup dan tidur siang dengan tenang", 0, 0),
    ("Bangun pagi dengan kondisi sehat, nafsu makan baik", 0, 0),
    ("Tidur pulas jam 9 malam, bangun jam 5 pagi dengan gembira", 0, 0),
    ("Sudah minum vitamin dan jalan santai di depan rumah", 0, 0),
    ("Hasil tensi normal 120/80 dan kakek tersenyum bahagia", 0, 0),
    ("Semua obat harian sudah diminum tepat waktu", 0, 0),
    ("Lansia beraktivitas seperti biasa tanpa keluhan rasa sakit", 0, 0),
    ("Bicara lancar, ingatan baik, dan bugar", 0, 0),
    ("Nenek menikmati sarapan pagi dan ngobrol bersama cucu", 0, 0),
    ("Kondisi fisik dan mental sangat baik hari ini", 0, 0),

    # --- 1: TRAUMA / CEDERA FISIK ---
    ("Jatuh dari tempat tidur dan tidak bisa bangun lagi", 2, 1),
    ("Kecelakaan di kamar mandi dan kepalanya terbentur keras", 2, 1),
    ("Terpleset saat lari pagi, pergelangan kaki bengkak dan memar", 1, 1),
    ("Luka teriris pisau di dapur dan berdarah cukup banyak", 2, 1),
    ("Kakinya tersandung meja, memar kebiruan dan nyeri saat diinjak", 1, 1),
    ("Terjatuh dari tangga, memegang pinggul dan menangis kesakitan", 2, 1),
    ("Lengan terbentur pintu hingga bengkak dan merah", 1, 1),
    ("Lansia tergelincir di ubin licin dan siku terbentur", 1, 1),
    ("Kepala kejatuhan benda dari atas, pusing dan benjol besar", 2, 1),
    ("Jari tangan terjepit pintu, berdarah dan kuku copot", 2, 1),
    ("Ada luka lecet di lutut akibat jatuh di halaman", 1, 1),
    ("Tersiram air panas di tangan, kulit melenting merah", 2, 1),
    ("Patah tulang dicurigai setelah terpleset di teras", 2, 1),
    ("Kulit terkelupas dan berdarah karena tergores pagar", 1, 1),
    ("Luka bakar ringan di jari saat menyeduh teh", 1, 1),

    # --- 2: KARDIOVASKULAR / DARAH & JANTUNG ---
    ("Bapak mengeluh nyeri dada hebat menjalar ke lengan kiri", 2, 2),
    ("Tiba-tiba pingsan di dapur dan tidak sadarkan diri", 2, 2),
    ("Tekanan darah melonjak tinggi 180/100, leher tegang kaku", 2, 2),
    ("Detak jantung terasa berdebar sangat cepat dan dada berdebar keras", 2, 2),
    ("Tensi agak naik dari biasanya setelah makan asin", 1, 2),
    ("Sering pusing keliling serasa berputar saat berdiri dari duduk", 1, 2),
    ("Dada terasa sesak seperti ditindih beban berat dan keringat dingin", 2, 2),
    ("Muka pucat, bibir agak biru, dan nadi terasa sangat lemah", 2, 2),
    ("Denyut nadi teraba sangat lambat kurang dari 50 kali per menit", 2, 2),
    ("Vertigo kambuh, merasa berputar dan tidak bisa menyeimbangkan diri", 1, 2),
    ("Kaki bengkak di kedua pergelangan dan sering berdebar malam hari", 1, 2),
    ("Tensi darah 150/90, mengeluh tengkuk pegal dan pusing", 1, 2),
    ("Rasa ampek di dada sebelah kiri, seperti diremas", 2, 2),
    ("Kepala melayang pusing sekali seperti mau pingsan", 1, 2),
    ("Hipertensi kambuh, rasa leher berat dan berkeringat dingin", 2, 2),

    # --- 3: PERNAPASAN / RESPIRASI ---
    ("Ada darah segar saat batuk parah", 2, 3),
    ("Napasnya sangat sesak tersengal-sengal dan berbunyi ngik", 2, 3),
    ("Batuk terus menerus berdahak kental warna hijau", 1, 3),
    ("Hidung tersumbat berat dan agak sulit bernapas saat tidur", 1, 3),
    ("Dada terasa berat dan sakit saat menarik napas dalam", 2, 3),
    ("Asma kambuh setelah menghirup debu dan asap kendaraan", 2, 3),
    ("Laju pernapasan sangat cepat lebih dari 25 kali per menit", 2, 3),
    ("Tenggorokan gatal dan batuk kering tanpa henti", 1, 3),
    ("Napas pendek-pendek walaupun cuma jalan beberapa langkah", 2, 3),
    ("Menggorok keras saat tidur dan tersedak terbangun kehabisan napas", 1, 3),
    ("Batuk menggelegar dan merasa tenggorokan tersumbat lender", 1, 3),
    ("Napas berbunyi grok-grok dan dada terasa ngilu", 2, 3),
    ("Paru-paru terasa penuh dan susah menghirup oksigen", 2, 3),
    ("Flu berat, hidung tersumbat, dan bersin terus", 1, 3),
    ("Dada mengikat dan batuk berkepanjangan 3 hari", 1, 3),

    # --- 4: PENGERNAAN / GASTROINTESTINAL ---
    ("Ibu merasa mual muntah terus menerus tidak ada makanan masuk", 2, 4),
    ("Muntah dua kali pagi ini setelah sarapan", 1, 4),
    ("Sakit perut melilit hebat dan diare cair berkali-kali", 2, 4),
    ("Buang air besar berwarna hitam pekat atau ada darahnya", 2, 4),
    ("Perut terasa begah, mual, dan perih seperti asam lambung naik", 1, 4),
    ("Sembelit tidak bisa BAB selama 5 hari, perut keras dan kembung", 1, 4),
    ("Nafsu makan hilang sama sekali dan merasa mual lihat makanan", 1, 4),
    ("Ulu hati terasa terbakar menggelegak (heartburn)", 1, 4),
    ("Muntah darah berwarna merah kecokelatan", 2, 4),
    ("Perut mules melilit tidak kuat menahan BAB", 1, 4),
    ("Diare lebih dari 6 kali sehari sampai lemas", 2, 4),
    ("Susah menelan makanan karena tenggorokan dan lambung perih", 1, 4),
    ("Banyak kentut dan perut kembung bergas", 0, 4),
    ("Nyeri hebat di lambung setelah minum kopi/pedas", 1, 4),
    ("Merasa enek dan ingin muntah sepanjang hari", 1, 4),

    # --- 5: INFEKSI / DEMAM ---
    ("Suhu badan sangat tinggi 39.5 derajat dan menggigil hebat", 2, 5),
    ("Demam ringan 37.8 derajat sejak semalam", 1, 5),
    ("Badan terasa panas dingin, keringat dingin, dan meriang", 1, 5),
    ("Luka bekas operasi bernanah, kemerahan, dan meradang panas", 2, 5),
    ("Tenggorokan sangat sakit untuk menelan dan badan anget", 1, 5),
    ("Badan menggigil gemetaran dan suhu tubuh melonjak naik", 2, 5),
    ("Ada bisul atau borok bernanah di kulit yang menyebar", 1, 5),
    ("Demam tidak turun-turun setelah diberi parasetamol", 2, 5),
    ("Badan pegal linu seluruh tubuh disertai demam tinggi", 2, 5),
    ("Kulit merah kemerahan bengkak terasa panas saat dipegang", 1, 5),
    ("Buang air kecil terasa panas terbakar dan sering demam", 2, 5),
    ("Kelenjar di leher membengkak dan terasa sakit bila ditekan", 1, 5),
    ("Cacar/bintik merah berair gatal di dada dan punggung", 1, 5),
    ("Mata merah berair dan demam sejak kemarin", 1, 5),
    ("Infeksi pada kulit luka lembab berbau tidak sedap", 2, 5),

    # --- 6: SARAF / NEUROLOGIS ---
    ("Kejang-kejang mendadak dan mulut keluar busa", 2, 6),
    ("Bicara tiba-tiba pelo dan separuh wajah kaku miring (gejala stroke)", 2, 6),
    ("Tangan dan kaki kanan tiba-tiba lumpuh tidak bisa digerakkan", 2, 6),
    ("Tangan sering gemetar tremot tidak terkendali saat pegang sendok", 1, 6),
    ("Lupa ingatan parah mendadak, tidak mengenali anak dan rumah sendiri", 1, 6),
    ("Sakit kepala sebelah yang berdenyut luar biasa tidak tertahankan", 2, 6),
    ("Penglihatan kabur mendadak atau ganda secara tiba-tiba", 2, 6),
    ("Bingung disorientasi waktu dan tempat, ngelantur bicara", 2, 6),
    ("Kesemutan atau kebas hebat separuh badan", 1, 6),
    ("Pusing kleyengan tidak stabil jalan seperti mau roboh", 1, 6),
    ("Sulit mengontrol buang air kecil karena pikun/saraf", 1, 6),
    ("Otot wajah kejang sebelah dan kelopak mata turun mendadak", 2, 6),
    ("Sering lupa meletakkan barang dan tampak bingung", 0, 6),
    ("Refleks tubuh lambat dan sulit diajak komunikasi", 1, 6),
    ("Nyeri menusuk seperti diiris silet di sepanjang jalur saraf wajah", 2, 6),

    # --- 7: OTOT & SENDI (MUSKULOSKELETAL) ---
    ("Nyeri sendi lutut hebat hingga tidak bisa dipakai berjalan", 1, 7),
    ("Punggung bawah sakit sekali jika membungkuk atau berdiri", 1, 7),
    ("Bahu kaku sulit diangkat dan menggejal pusing", 1, 7),
    ("Otot betis kram hebat saat tidur di malam hari", 1, 7),
    ("Asam urat kambuh, jempol kaki bengkak merah panas", 1, 7),
    ("Pinggang pegal linu setelah banyak duduk", 0, 7),
    ("Sendi jari-jari tangan kaku dan bengkak saat pagi hari", 1, 7),
    ("Rematik kambuh di cuaca dingin, seluruh sendi ngilu", 1, 7),
    ("Nyeri di tulang ekor saat duduk agak lama", 1, 7),
    ("Leher kaku tidak bisa ditengokkan ke kiri atau kanan", 1, 7),
    ("Otot paha tertarik dan terasa nyeri menusuk", 1, 7),
    ("Tumit sakit saat pertama kali menapak di pagi hari", 1, 7),
    ("Kram perut atau pinggul otot tegang", 1, 7),
    ("Pegal-pegal di pundak setelah beraktivitas", 0, 7),
    ("Sendi pergelangan tangan ngilu saat mengangkat cangkir", 1, 7)
]

texts = [item[0] for item in data]
labels_urgency = [item[1] for item in data]
labels_disease = [item[2] for item in data]

# 1. Feature Extraction (TF-IDF Vectorizer)
vectorizer = TfidfVectorizer(lowercase=True, ngram_range=(1, 2))
X = vectorizer.fit_transform(texts)

# 2. Train Models (Multinomial Logistic Regression)
model_urgency = LogisticRegression(multi_class='multinomial', solver='lbfgs', max_iter=500)
model_urgency.fit(X, labels_urgency)

model_disease = LogisticRegression(multi_class='multinomial', solver='lbfgs', max_iter=500)
model_disease.fit(X, labels_disease)

# 3. Export Models & Metadata to JSON
model_data = {
    "vocabulary": vectorizer.vocabulary_,
    "idf": vectorizer.idf_.tolist(),
    
    # Urgency Model
    "urgency_classes": model_urgency.classes_.tolist(),
    "urgency_coef": model_urgency.coef_.tolist(),
    "urgency_intercept": model_urgency.intercept_.tolist(),
    "urgency_names": {
        0: "Rendah (Normal / Stabil)",
        1: "Sedang (Perlu Perhatian / Pemantauan)",
        2: "Tinggi (🚨 DARURAT MEDIS)"
    },
    "urgency_css": {
        0: "badge-low",
        1: "badge-medium",
        2: "badge-high"
    },

    # Disease Model
    "disease_classes": model_disease.classes_.tolist(),
    "disease_coef": model_disease.coef_.tolist(),
    "disease_intercept": model_disease.intercept_.tolist(),
    "disease_names": {
        0: "Kondisi Normal / Stabil",
        1: "Indikasi Trauma / Cedera Fisik",
        2: "Indikasi Kardiovaskular / Darah & Jantung",
        3: "Indikasi Masalah Pernapasan (Respirasi)",
        4: "Gangguan Sistem Pencernaan (Gastrointestinal)",
        5: "Indikasi Infeksi / Demam (Pyrexia)",
        6: "Gangguan Neurologis / Saraf",
        7: "Masalah Otot & Sendi (Muskuloskeletal)"
    }
}

with open('model/model.json', 'w', encoding='utf-8') as f:
    json.dump(model_data, f, indent=4, ensure_ascii=False)

print(f"Berhasil melatih model dengan {len(data)} dataset sampel!")
print("Model ML (Urgency & Disease) sukses diekspor ke model/model.json")

