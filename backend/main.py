from pathlib import Path
from io import BytesIO
from collections import Counter
import re
import asyncio
import threading
import time
import uuid

import pandas as pd
import torch

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)


# ============================================================
# MBG INSIGHT
# IndoBERT Classification + Analytics + Thematic Insight
# ============================================================


# ============================================================
# 1. PATH & MODEL CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = (
    BASE_DIR
    / "model"
    / "MODEL_FINAL_SEED42_REVISI"
)

TOKENIZER_DIR = MODEL_DIR

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

MAX_LENGTH = 384
HEAD_LENGTH = 191
TAIL_LENGTH = 191
BATCH_SIZE = 16


LABEL_MAP = {
    0: "Kritik Nonkonstruktif",
    1: "Kritik Konstruktif",
    2: "Tidak Layak/Bukan Kritik"
}


# ============================================================
# 2. STOPWORDS UNTUK ANALITIK
#
# HANYA untuk:
# - kata populer
# - frasa
# - wordcloud
#
# Tidak memengaruhi IndoBERT.
# ============================================================

ANALYTICS_STOPWORDS = {

    "yang",
    "dan",
    "di",
    "ke",
    "dari",
    "ini",
    "itu",
    "untuk",
    "dengan",
    "pada",
    "dalam",
    "adalah",
    "atau",
    "juga",
    "karena",
    "ada",
    "tidak",
    "bisa",
    "jadi",
    "akan",
    "sudah",
    "saja",
    "sama",
    "lebih",
    "agar",
    "kalau",
    "kalo",
    "harus",
    "masih",
    "sebagai",
    "oleh",
    "para",
    "mereka",
    "kita",
    "kami",
    "saya",
    "aku",
    "gue",
    "gua",
    "lu",
    "nya",
    "nih",
    "sih",
    "aja",
    "pun",
    "lah",
    "kok",
    "dong",
    "tapi",
    "tetapi",
    "namun",
    "sehingga",
    "supaya",
    "seperti",
    "terus",
    "jangan",
    "buat",
    "bagi",
    "bukan",
    "belum",
    "udah",
    "gak",
    "ga",
    "nggak",
    "enggak",
    "yg",
    "dg",
    "dgn",
    "dr",
    "utk",

    "user",
    "http",
    "https",

    "mbg",
    "program",
    "makan",
    "bergizi",
    "gratis",
    "makanan"
}


# ============================================================
# 3. TEMA KRITIK KONSTRUKTIF
#
# strong_keywords = indikator cukup kuat
# weak_keywords   = indikator pendukung
# phrases         = indikator paling kuat
#
# Poin:
# strong keyword = 2
# weak keyword   = 1
# phrase         = 3
#
# Minimum skor untuk menerima tema = 2
# ============================================================

THEME_DEFINITIONS = {

    # --------------------------------------------------------
    # KUALITAS
    # --------------------------------------------------------

    "quality_safety": {

        "label":
            "Kualitas dan Keamanan Makanan",

        "strong_keywords": {
            "basi",
            "busuk",
            "keracunan",
            "higienis",
            "higienitas",
            "sanitasi",
            "kontaminasi",
            "mentah",
            "segar",
            "kebersihan",
            "keamanan"
        },

        "weak_keywords": {
            "kualitas",
            "mutu",
            "bersih",
            "matang",
            "rasa",
            "aman",
            "bau",
            "kotor",
            "pengolahan",
            "masak",
            "memasak"
        },

        "phrases": {
            "kualitas makanan",
            "keamanan makanan",
            "bahan baku",
            "proses masak",
            "proses memasak",
            "kualitas bahan",
            "kontrol kualitas",
            "standar kualitas",
            "standar kebersihan",
            "uji makanan",
            "makanan basi",
            "makanan busuk",
            "makanan mentah"
        },

        "description":
            (
                "Masukan pada kelompok ini menyoroti mutu, "
                "kebersihan, keamanan, bahan baku, dan "
                "proses pengolahan makanan."
            ),

        "direction":
            (
                "Arah evaluasi dapat difokuskan pada "
                "penguatan standar mutu, sanitasi, "
                "pengendalian bahan baku, serta pemeriksaan "
                "makanan sebelum didistribusikan."
            )
    },


    # --------------------------------------------------------
    # PENGAWASAN
    # --------------------------------------------------------

    "monitoring_governance": {

        "label":
            "Pengawasan dan Tata Kelola",

        "strong_keywords": {
            "pengawasan",
            "mengawasi",
            "diawasi",
            "pengawas",
            "audit",
            "transparansi",
            "transparan",
            "inspeksi",
            "bpom",
            "pengaduan",
            "sanksi",
            "monitoring",
            "tender"
        },

        "weak_keywords": {
            "evaluasi",
            "kontrol",
            "vendor",
            "penyedia",
            "pelaporan",
            "pengadaan"
        },

        "phrases": {
            "perlu diawasi",
            "harus diawasi",
            "pengawasan ketat",
            "pengawasan kualitas",
            "evaluasi berkala",
            "mekanisme pengawasan",
            "sistem pengawasan",
            "laporan masyarakat",
            "kanal pengaduan",
            "penyedia makanan",
            "pengawasan dapur",
            "transparansi anggaran"
        },

        "description":
            (
                "Masukan pada kelompok ini menekankan "
                "pengawasan pelaksanaan, evaluasi penyedia, "
                "transparansi, dan mekanisme kontrol program."
            ),

        "direction":
            (
                "Arah evaluasi dapat mempertimbangkan "
                "mekanisme monitoring yang lebih jelas, "
                "evaluasi berkala, pelaporan, dan tindak "
                "lanjut ketika ditemukan permasalahan."
            )
    },


    # --------------------------------------------------------
    # DISTRIBUSI
    # --------------------------------------------------------

    "distribution_timing": {

        "label":
            "Distribusi dan Ketepatan Pelaksanaan",

        "strong_keywords": {
            "distribusi",
            "pengiriman",
            "keterlambatan",
            "logistik",
            "penyaluran",
            "pengantaran"
        },

        "weak_keywords": {
            "dikirim",
            "kirim",
            "pembagian",
            "dibagikan",
            "jadwal",
            "terlambat",
            "waktu",
            "tiba",
            "disalurkan",
            "antar"
        },

        "phrases": {
            "tepat waktu",
            "waktu pembagian",
            "jadwal pembagian",
            "proses distribusi",
            "ketepatan waktu",
            "rantai distribusi",
            "sistem distribusi",
            "makanan datang",
            "makanan tiba",
            "terlambat datang"
        },

        "description":
            (
                "Masukan pada kelompok ini berkaitan dengan "
                "waktu pembagian, proses pengiriman, "
                "logistik, dan konsistensi pelaksanaan."
            ),

        "direction":
            (
                "Arah evaluasi dapat difokuskan pada "
                "ketepatan jadwal, efisiensi distribusi, "
                "serta kondisi makanan ketika sampai kepada "
                "penerima."
            )
    },


    # --------------------------------------------------------
    # MENU/GIZI
    # --------------------------------------------------------

    "nutrition_menu": {

        "label":
            "Menu dan Pemenuhan Gizi",

        "strong_keywords": {
            "nutrisi",
            "protein",
            "kalori",
            "vitamin",
            "karbohidrat",
            "variasi",
            "seimbang"
        },

        "weak_keywords": {
            "menu",
            "porsi",
            "sayur",
            "buah",
            "telur",
            "susu",
            "lauk"
        },

        "phrases": {
            "variasi menu",
            "menu seimbang",
            "menu sehat",
            "porsi makanan",
            "kandungan gizi",
            "pemenuhan gizi",
            "nilai gizi",
            "gizi seimbang",
            "kebutuhan gizi"
        },

        "description":
            (
                "Masukan pada kelompok ini berhubungan "
                "dengan variasi menu, porsi, kandungan "
                "nutrisi, dan keseimbangan makanan."
            ),

        "direction":
            (
                "Arah evaluasi dapat dilakukan dengan "
                "meninjau variasi menu dan kesesuaian "
                "komposisi makanan dengan kebutuhan gizi "
                "penerima."
            )
    },


    # --------------------------------------------------------
    # SASARAN
    # --------------------------------------------------------

    "targeting_equity": {

        "label":
            "Ketepatan Sasaran dan Pemerataan",

        "strong_keywords": {
            "sasaran",
            "pemerataan",
            "prioritas",
            "kemiskinan",
            "target"
        },

        "weak_keywords": {
            "penerima",
            "merata",
            "miskin",
            "membutuhkan",
            "adil",
            "keadilan"
        },

        "phrases": {
            "tepat sasaran",
            "salah sasaran",
            "penerima manfaat",
            "lebih membutuhkan",
            "pemerataan penerima",
            "prioritas penerima",
            "sasaran program",
            "penerima program"
        },

        "description":
            (
                "Masukan pada kelompok ini menyoroti "
                "penentuan penerima, pemerataan manfaat, "
                "dan ketepatan sasaran program."
            ),

        "direction":
            (
                "Arah evaluasi dapat diarahkan pada "
                "validasi penerima dan pemerataan manfaat "
                "agar pelaksanaan sesuai dengan kelompok "
                "yang menjadi prioritas."
            )
    },


    # --------------------------------------------------------
    # ANGGARAN
    # --------------------------------------------------------

    "budget_efficiency": {

        "label":
            "Anggaran dan Efisiensi",

        "strong_keywords": {
            "anggaran",
            "pemborosan",
            "efisiensi",
            "apbn",
            "pajak",
            "korupsi"
        },

        "weak_keywords": {
            "biaya",
            "dana",
            "boros",
            "efisien",
            "harga",
            "mahal",
            "murah"
        },

        "phrases": {
            "penggunaan anggaran",
            "efisiensi anggaran",
            "transparansi anggaran",
            "penggunaan dana",
            "dana program",
            "uang negara",
            "biaya program"
        },

        "description":
            (
                "Masukan pada kelompok ini berkaitan "
                "dengan penggunaan dana, efisiensi biaya, "
                "dan akuntabilitas anggaran program."
            ),

        "direction":
            (
                "Arah evaluasi dapat mempertimbangkan "
                "penggunaan anggaran yang lebih transparan, "
                "efisien, dan sebanding dengan manfaat "
                "program."
            )
    },


    # --------------------------------------------------------
    # SEKOLAH/MASYARAKAT
    #
    # PENTING:
    # Kata generik seperti "sekolah", "siswa", "murid",
    # dan "orang" TIDAK dijadikan indikator tunggal.
    # --------------------------------------------------------

    "school_community": {

        "label":
            "Keterlibatan Sekolah dan Masyarakat",

        "strong_keywords": {
            "komite",
            "orangtua",
            "masyarakat",
            "umkm",
            "petani"
        },

        "weak_keywords": {
            "lokal",
            "wali",
            "keluarga",
            "koordinasi",
            "pelibatan",
            "melibatkan",
            "keterlibatan"
        },

        "phrases": {
            "orang tua",
            "pihak sekolah",
            "komite sekolah",
            "masyarakat lokal",
            "umkm lokal",
            "petani lokal",
            "kepala sekolah",
            "wali murid",
            "melibatkan sekolah",
            "melibatkan orang tua",
            "melibatkan masyarakat",
            "keterlibatan sekolah",
            "keterlibatan masyarakat",
            "koordinasi sekolah"
        },

        "description":
            (
                "Masukan pada tema ini berhubungan dengan "
                "pelibatan sekolah, keluarga, masyarakat, "
                "dan pelaku lokal dalam pelaksanaan program."
            ),

        "direction":
            (
                "Arah evaluasi dapat mempertimbangkan "
                "komunikasi, koordinasi, dan pelibatan "
                "pihak sekolah, keluarga, serta masyarakat "
                "yang terkait dengan pelaksanaan program."
            )
    },


    # --------------------------------------------------------
    # FASILITAS
    # --------------------------------------------------------

    "facilities_operations": {

        "label":
            "Fasilitas dan Operasional",

        "strong_keywords": {
            "sppg",
            "fasilitas",
            "sarana",
            "peralatan",
            "operasional",
            "produksi",
            "kapasitas"
        },

        "weak_keywords": {
            "dapur",
            "alat",
            "petugas",
            "tenaga",
            "sdm"
        },

        "phrases": {
            "dapur mbg",
            "dapur umum",
            "fasilitas dapur",
            "tenaga kerja",
            "tenaga dapur",
            "kapasitas produksi",
            "sarana prasarana",
            "proses operasional",
            "petugas dapur"
        },

        "description":
            (
                "Masukan pada kelompok ini berkaitan "
                "dengan kesiapan dapur, fasilitas, tenaga "
                "pelaksana, kapasitas produksi, dan proses "
                "operasional."
            ),

        "direction":
            (
                "Arah evaluasi dapat difokuskan pada "
                "kecukupan fasilitas, kapasitas operasional, "
                "dan kesiapan sumber daya pelaksana."
            )
    }

}


# ============================================================
# 4. MONTH LABEL
# ============================================================

MONTH_NAMES = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "Mei",
    6: "Jun",
    7: "Jul",
    8: "Agu",
    9: "Sep",
    10: "Okt",
    11: "Nov",
    12: "Des"
}


# ============================================================
# 5. LOAD INDOBERT
# ============================================================

print("=" * 70)
print("MBG INSIGHT - LOADING INDOBERT")
print("=" * 70)

print(f"Model Directory    : {MODEL_DIR}")
print(f"Tokenizer Directory: {TOKENIZER_DIR}")
print(f"Device             : {DEVICE}")


if not MODEL_DIR.exists():

    raise FileNotFoundError(
        f"Folder model tidak ditemukan:\n{MODEL_DIR}"
    )


if not TOKENIZER_DIR.exists():

    raise FileNotFoundError(
        f"Folder tokenizer tidak ditemukan:\n{TOKENIZER_DIR}"
    )


tokenizer = AutoTokenizer.from_pretrained(
    str(TOKENIZER_DIR),
    local_files_only=True
)


model = (
    AutoModelForSequenceClassification
    .from_pretrained(
        str(MODEL_DIR),
        local_files_only=True
    )
)


model.to(DEVICE)
model.eval()


tokenizer_size = len(tokenizer)

embedding_size = (
    model
    .get_input_embeddings()
    .num_embeddings
)

num_labels = model.config.num_labels


print(f"Tokenizer Size  : {tokenizer_size}")
print(f"Embedding Size  : {embedding_size}")
print(f"Num Labels      : {num_labels}")


if tokenizer_size > embedding_size:

    raise ValueError(
        "Ukuran tokenizer melebihi embedding model."
    )


if num_labels != len(LABEL_MAP):

    raise ValueError(
        f"Model harus memiliki {len(LABEL_MAP)} kelas, "
        f"tetapi terdeteksi {num_labels}."
    )


print("✅ IndoBERT siap digunakan.")
print("=" * 70)


# ============================================================
# 6. FASTAPI
# ============================================================

app = FastAPI(
    title="MBG Insight API",

    description=(
        "API klasifikasi dan analitik kritik terhadap "
        "Program Makan Bergizi Gratis menggunakan IndoBERT."
    ),

    version="1.4.1"
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class PredictRequest(BaseModel):

    text: str


# ============================================================
# 7. HEAD-TAIL TOKENIZATION
# ============================================================

def encode_head_tail(text: str):

    token_ids = tokenizer.encode(
        str(text),
        add_special_tokens=False,
        truncation=False
    )


    original_length = len(token_ids)


    max_content_length = (
        MAX_LENGTH - 2
    )


    if original_length <= max_content_length:

        selected_ids = token_ids
        head_tail_applied = False

    else:

        selected_ids = (
            token_ids[:HEAD_LENGTH]
            +
            token_ids[-TAIL_LENGTH:]
        )

        head_tail_applied = True


    input_ids = (
        [tokenizer.cls_token_id]
        +
        selected_ids
        +
        [tokenizer.sep_token_id]
    )


    attention_mask = (
        [1] * len(input_ids)
    )


    token_type_ids = (
        [0] * len(input_ids)
    )


    padding_length = (
        MAX_LENGTH
        -
        len(input_ids)
    )


    input_ids += (
        [tokenizer.pad_token_id]
        *
        padding_length
    )


    attention_mask += (
        [0]
        *
        padding_length
    )


    token_type_ids += (
        [0]
        *
        padding_length
    )


    return {
        "input_ids":
            input_ids,

        "attention_mask":
            attention_mask,

        "token_type_ids":
            token_type_ids,

        "original_length":
            original_length,

        "head_tail_applied":
            head_tail_applied
    }


# ============================================================
# 8. SINGLE PREDICTION
# ============================================================

def predict_text(text: str):

    text = str(text).strip()


    if not text:

        raise ValueError(
            "Teks tidak boleh kosong."
        )


    encoded = encode_head_tail(
        text
    )


    input_ids = torch.tensor(
        [encoded["input_ids"]],
        dtype=torch.long
    ).to(DEVICE)


    attention_mask = torch.tensor(
        [encoded["attention_mask"]],
        dtype=torch.long
    ).to(DEVICE)


    token_type_ids = torch.tensor(
        [encoded["token_type_ids"]],
        dtype=torch.long
    ).to(DEVICE)


    with torch.no_grad():

        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids
        )


        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )[0]


    prediction_id = int(
        torch.argmax(
            probabilities
        ).item()
    )


    confidence = float(
        probabilities[
            prediction_id
        ].item()
    )


    return {

        "prediction_id":
            prediction_id,

        "label":
            LABEL_MAP[
                prediction_id
            ],

        "confidence":
            round(
                confidence,
                6
            ),

        "confidence_percent":
            round(
                confidence * 100,
                2
            ),

        "probabilities": {

            "nonkonstruktif":
                round(
                    float(
                        probabilities[0]
                        .item()
                    ),
                    6
                ),

            "konstruktif":
                round(
                    float(
                        probabilities[1]
                        .item()
                    ),
                    6
                ),

            "bukan_kritik":
                round(
                    float(
                        probabilities[2]
                        .item()
                    ),
                    6
                )
        },

        "token_length":
            encoded[
                "original_length"
            ],

        "head_tail_applied":
            encoded[
                "head_tail_applied"
            ]
    }


# ============================================================
# 9. BATCH PREDICTION
# ============================================================

def predict_batch(texts):

    predictions = []

    total_data = len(texts)


    for start in range(
        0,
        total_data,
        BATCH_SIZE
    ):

        batch_texts = texts[
            start:
            start + BATCH_SIZE
        ]


        batch_encoded = [
            encode_head_tail(text)
            for text in batch_texts
        ]


        input_ids = torch.tensor(
            [
                item["input_ids"]
                for item
                in batch_encoded
            ],
            dtype=torch.long
        ).to(DEVICE)


        attention_mask = torch.tensor(
            [
                item["attention_mask"]
                for item
                in batch_encoded
            ],
            dtype=torch.long
        ).to(DEVICE)


        token_type_ids = torch.tensor(
            [
                item["token_type_ids"]
                for item
                in batch_encoded
            ],
            dtype=torch.long
        ).to(DEVICE)


        with torch.no_grad():

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                token_type_ids=token_type_ids
            )


            probs = torch.softmax(
                outputs.logits,
                dim=-1
            )


        pred_ids = torch.argmax(
            probs,
            dim=-1
        )


        for index in range(
            len(batch_texts)
        ):

            prediction_id = int(
                pred_ids[index].item()
            )


            confidence = float(
                probs[
                    index,
                    prediction_id
                ].item()
            )


            predictions.append({

                "prediction_id":
                    prediction_id,

                "label":
                    LABEL_MAP[
                        prediction_id
                    ],

                "confidence_percent":
                    round(
                        confidence * 100,
                        2
                    ),

                "prob_nonkonstruktif":
                    round(
                        float(
                            probs[
                                index,
                                0
                            ].item()
                        ),
                        6
                    ),

                "prob_konstruktif":
                    round(
                        float(
                            probs[
                                index,
                                1
                            ].item()
                        ),
                        6
                    ),

                "prob_bukan_kritik":
                    round(
                        float(
                            probs[
                                index,
                                2
                            ].item()
                        ),
                        6
                    ),

                "token_length":
                    batch_encoded[
                        index
                    ][
                        "original_length"
                    ],

                "head_tail_applied":
                    batch_encoded[
                        index
                    ][
                        "head_tail_applied"
                    ]
            })


        selesai = min(
            start + BATCH_SIZE,
            total_data
        )


        print(
            f"Progress klasifikasi: "
            f"{selesai}/{total_data}"
        )


        # -------------------------------------------------------
        # Progress untuk UI dashboard.
        # Tidak mengubah hasil prediksi dan aman bila progress
        # belum diregistrasikan.
        # -------------------------------------------------------

        try:
            report_active_analysis_progress(
                selesai,
                total_data
            )

        except NameError:
            pass


        # Memberi kesempatan event loop/server melayani request
        # status progress setelah setiap batch selesai.
        time.sleep(0.05)


    return predictions


# ============================================================
# 10. READ CSV
# ============================================================

def read_csv_file(file_bytes: bytes):

    encodings = [
        "utf-8-sig",
        "utf-8",
        "latin-1"
    ]


    last_error = None


    for encoding in encodings:

        try:

            return pd.read_csv(
                BytesIO(file_bytes),
                encoding=encoding,
                dtype=str,
                keep_default_na=False
            )

        except Exception as error:

            last_error = error


    raise ValueError(
        "CSV tidak dapat dibaca. "
        f"Detail: {last_error}"
    )


# ============================================================
# 11. NORMALIZE COLUMNS
# ============================================================

def normalize_columns(df):

    df.columns = [
        str(column).strip()
        for column in df.columns
    ]


    required_columns = [
        "Tweet ID",
        "Tanggal",
        "Full text",
        "Clean text"
    ]


    missing_columns = [
        column
        for column in required_columns
        if column not in df.columns
    ]


    if missing_columns:

        raise ValueError(
            "Kolom wajib tidak ditemukan: "
            +
            ", ".join(
                missing_columns
            )
        )


    for column in required_columns:

        df[column] = (
            df[column]
            .fillna("")
            .astype(str)
            .str.strip()
        )


    return df


# ============================================================
# 12. ANALYTICS TOKENIZER
# ============================================================

def tokenize_for_analytics(text):

    text = str(text).lower()


    tokens = re.findall(
        r"\b[a-zA-Z]+\b",
        text
    )


    return [
        token
        for token in tokens
        if (
            len(token) >= 3
            and
            token not in ANALYTICS_STOPWORDS
        )
    ]


# ============================================================
# 13. NORMALIZE THEME TEXT
# ============================================================

def normalize_theme_text(text):

    text = str(text).lower()


    text = re.sub(
        r"[^a-zA-Z0-9\s]",
        " ",
        text
    )


    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()


    token_set = set(
        text.split()
    )


    return (
        text,
        token_set
    )


# ============================================================
# 14. THEME SCORING
# ============================================================

def score_theme(
    text,
    token_set,
    definition
):

    score = 0

    matched_terms = []

    strong_hits = 0
    weak_hits = 0
    phrase_hits = 0


    # --------------------------------------------------------
    # Strong keyword
    # --------------------------------------------------------

    for keyword in definition[
        "strong_keywords"
    ]:

        if keyword in token_set:

            score += 2
            strong_hits += 1

            matched_terms.append(
                keyword
            )


    # --------------------------------------------------------
    # Weak keyword
    # --------------------------------------------------------

    for keyword in definition[
        "weak_keywords"
    ]:

        if keyword in token_set:

            score += 1
            weak_hits += 1

            matched_terms.append(
                keyword
            )


    # --------------------------------------------------------
    # Phrase
    # --------------------------------------------------------

    for phrase in definition[
        "phrases"
    ]:

        if phrase in text:

            score += 3
            phrase_hits += 1

            matched_terms.append(
                phrase
            )


    return {
        "score":
            score,

        "matched_terms":
            matched_terms,

        "strong_hits":
            strong_hits,

        "weak_hits":
            weak_hits,

        "phrase_hits":
            phrase_hits
    }


# ============================================================
# 15. CLASSIFY CONSTRUCTIVE THEME
#
# Aturan diterima:
#
# - phrase ditemukan, ATAU
# - strong keyword ditemukan, ATAU
# - minimal 2 weak keyword
#
# dan total skor minimal 2.
#
# Jika skor tema pertama dan kedua sama,
# tema dianggap ambigu → Masukan Lainnya.
# ============================================================

def classify_constructive_theme(text):

    (
        normalized_text,
        token_set
    ) = normalize_theme_text(
        text
    )


    candidates = []


    for (
        theme_key,
        definition
    ) in THEME_DEFINITIONS.items():

        result = score_theme(
            normalized_text,
            token_set,
            definition
        )


        valid_evidence = (

            result[
                "phrase_hits"
            ] >= 1

            or

            result[
                "strong_hits"
            ] >= 1

            or

            result[
                "weak_hits"
            ] >= 2

        )


        if (
            result[
                "score"
            ] >= 2

            and

            valid_evidence
        ):

            candidates.append({

                "theme":
                    theme_key,

                "score":
                    result[
                        "score"
                    ],

                "matched_terms":
                    result[
                        "matched_terms"
                    ]
            })


    if not candidates:

        return {
            "theme":
                "other",

            "label":
                "Masukan Lainnya",

            "score":
                0,

            "matched_terms":
                []
        }


    candidates.sort(
        key=lambda item:
            item["score"],
        reverse=True
    )


    best = candidates[0]


    # --------------------------------------------------------
    # Ambiguous tie
    # --------------------------------------------------------

    if (
        len(candidates) >= 2
        and
        candidates[1]["score"]
        ==
        best["score"]
    ):

        return {
            "theme":
                "other",

            "label":
                "Masukan Lainnya",

            "score":
                best["score"],

            "matched_terms":
                best["matched_terms"]
        }


    return {
        "theme":
            best["theme"],

        "label":
            THEME_DEFINITIONS[
                best["theme"]
            ][
                "label"
            ],

        "score":
            best["score"],

        "matched_terms":
            best["matched_terms"]
    }


# ============================================================
# 16. TOP WORDS
# ============================================================

def get_top_words(
    texts,
    limit=25
):

    counter = Counter()


    for text in texts:

        counter.update(
            tokenize_for_analytics(
                text
            )
        )


    return [
        {
            "word":
                word,

            "count":
                int(count)
        }

        for word, count
        in counter.most_common(
            limit
        )
    ]


# ============================================================
# 17. TOP BIGRAMS
# ============================================================

def get_top_bigrams(
    texts,
    limit=15
):

    counter = Counter()


    for text in texts:

        tokens = (
            tokenize_for_analytics(
                text
            )
        )


        if len(tokens) < 2:

            continue


        bigrams = [
            (
                f"{tokens[index]} "
                f"{tokens[index + 1]}"
            )

            for index
            in range(
                len(tokens) - 1
            )
        ]


        counter.update(
            bigrams
        )


    return [
        {
            "phrase":
                phrase,

            "count":
                int(count)
        }

        for phrase, count
        in counter.most_common(
            limit
        )
    ]


# ============================================================
# 18. TIME TREND
# ============================================================

def build_time_trend(df):

    parsed_dates = pd.to_datetime(
        df["Tanggal"],
        errors="coerce",
        utc=True
    )


    valid_mask = (
        parsed_dates.notna()
    )


    valid_count = int(
        valid_mask.sum()
    )


    invalid_count = int(
        (~valid_mask).sum()
    )


    if valid_count == 0:

        return {
            "valid_dates":
                0,

            "invalid_dates":
                invalid_count,

            "data":
                []
        }


    trend_df = df.loc[
        valid_mask
    ].copy()


    dates = (
        parsed_dates[
            valid_mask
        ]
        .dt
        .tz_convert(None)
    )


    trend_df["Year"] = (
        dates.dt.year
    )

    trend_df["Month"] = (
        dates.dt.month
    )

    trend_df["Periode"] = (
        dates.dt.strftime(
            "%Y-%m"
        )
    )


    grouped = (
        trend_df
        .groupby(
            [
                "Year",
                "Month",
                "Periode",
                "Prediction ID"
            ]
        )
        .size()
        .reset_index(
            name="Jumlah"
        )
    )


    periods = (
        trend_df[
            [
                "Year",
                "Month",
                "Periode"
            ]
        ]
        .drop_duplicates()
        .sort_values(
            [
                "Year",
                "Month"
            ]
        )
    )


    result = []


    for _, row in periods.iterrows():

        periode = (
            row["Periode"]
        )

        year = int(
            row["Year"]
        )

        month = int(
            row["Month"]
        )


        period_group = grouped[
            grouped["Periode"]
            ==
            periode
        ]


        constructive = int(
            period_group.loc[
                period_group[
                    "Prediction ID"
                ]
                ==
                1,
                "Jumlah"
            ].sum()
        )


        nonconstructive = int(
            period_group.loc[
                period_group[
                    "Prediction ID"
                ]
                ==
                0,
                "Jumlah"
            ].sum()
        )


        bukan_kritik = int(
            period_group.loc[
                period_group[
                    "Prediction ID"
                ]
                ==
                2,
                "Jumlah"
            ].sum()
        )


        result.append({

            "periode":
                str(periode),

            "label":
                (
                    f"{MONTH_NAMES[month]} "
                    f"{year}"
                ),

            "tahun":
                year,

            "bulan":
                month,

            "konstruktif":
                constructive,

            "nonkonstruktif":
                nonconstructive,

            "bukan_kritik":
                bukan_kritik,

            "total":
                constructive
                +
                nonconstructive
                +
                bukan_kritik
        })


    return {
        "valid_dates":
            valid_count,

        "invalid_dates":
            invalid_count,

        "data":
            result
    }


# ============================================================
# 19. CONFIDENCE DISTRIBUTION
# ============================================================

def build_confidence_distribution(df):

    confidence = (
        df["Confidence"]
    )


    return [
        {
            "range":
                "≥ 90%",

            "count":
                int(
                    (
                        confidence >= 90
                    ).sum()
                )
        },

        {
            "range":
                "70–89,99%",

            "count":
                int(
                    (
                        (confidence >= 70)
                        &
                        (confidence < 90)
                    ).sum()
                )
        },

        {
            "range":
                "< 70%",

            "count":
                int(
                    (
                        confidence < 70
                    ).sum()
                )
        }
    ]


# ============================================================
# 20. EXAMPLES
# ============================================================

def get_examples(
    df,
    prediction_id,
    limit=8
):

    selected = (
        df[
            df["Prediction ID"]
            ==
            prediction_id
        ]
        .sort_values(
            "Confidence",
            ascending=False
        )
        .head(limit)
    )


    return [
        {
            "tweet_id":
                str(
                    row["Tweet ID"]
                ),

            "tanggal":
                str(
                    row["Tanggal"]
                ),

            "text":
                str(
                    row["Full text"]
                ),

            "clean_text":
                str(
                    row["Clean text"]
                ),

            "confidence":
                round(
                    float(
                        row["Confidence"]
                    ),
                    2
                )
        }

        for _, row
        in selected.iterrows()
    ]


# ============================================================
# 21. SUMMARY GENERATOR
# ============================================================

def build_summary_text(
    total_constructive,
    themes
):

    main_themes = [
        theme
        for theme in themes
        if (
            theme["theme"]
            !=
            "other"
        )
    ][:3]


    if total_constructive == 0:

        return (
            "Tidak terdapat kritik konstruktif pada "
            "dataset yang dianalisis."
        )


    if not main_themes:

        return (
            f"Terdapat {total_constructive} kritik "
            "konstruktif, tetapi masukan yang muncul "
            "belum membentuk kelompok tematik yang cukup "
            "kuat untuk diringkas secara otomatis. "
            "Komentar tetap dapat ditinjau melalui "
            "bagian data hasil."
        )


    first = main_themes[0]


    if len(main_themes) == 1:

        return (
            f"Berdasarkan {total_constructive} kritik "
            f"konstruktif yang dianalisis, pola masukan "
            f"yang paling menonjol berkaitan dengan "
            f"{first['label'].lower()} "
            f"({first['count']} komentar atau "
            f"{first['percentage']:.1f}%). "
            f"{first['direction']} "
            "Temuan ini dapat digunakan sebagai bahan "
            "awal untuk menentukan aspek Program MBG "
            "yang perlu ditinjau lebih lanjut."
        )


    second = main_themes[1]


    if len(main_themes) == 2:

        return (
            f"Berdasarkan {total_constructive} kritik "
            f"konstruktif yang dianalisis, masukan publik "
            f"terutama menyoroti "
            f"{first['label'].lower()} "
            f"({first['count']} komentar atau "
            f"{first['percentage']:.1f}%) dan "
            f"{second['label'].lower()} "
            f"({second['count']} komentar atau "
            f"{second['percentage']:.1f}%). "
            "Pola tersebut menunjukkan adanya beberapa "
            "aspek pelaksanaan Program MBG yang dapat "
            "menjadi prioritas untuk ditinjau dan "
            "dievaluasi lebih lanjut."
        )


    third = main_themes[2]


    return (
        f"Berdasarkan {total_constructive} kritik "
        f"konstruktif yang dianalisis, masukan publik "
        f"paling banyak menyoroti "
        f"{first['label'].lower()} "
        f"({first['count']} komentar atau "
        f"{first['percentage']:.1f}%). "
        f"Masukan lain yang cukup sering muncul berkaitan "
        f"dengan {second['label'].lower()} "
        f"({second['count']} komentar atau "
        f"{second['percentage']:.1f}%) serta "
        f"{third['label'].lower()} "
        f"({third['count']} komentar atau "
        f"{third['percentage']:.1f}%). "
        "Secara keseluruhan, pola tersebut menunjukkan "
        "bahwa kritik konstruktif tidak hanya berfokus "
        "pada satu persoalan, tetapi mengarah pada "
        "beberapa aspek pelaksanaan Program MBG yang "
        "dapat digunakan sebagai bahan evaluasi."
    )


# ============================================================
# 22. THEMATIC INSIGHT
# ============================================================

def build_constructive_insight(df):

    constructive_df = (
        df[
            df["Prediction ID"]
            ==
            1
        ]
        .copy()
    )


    total_constructive = len(
        constructive_df
    )


    theme_counts = Counter()

    theme_terms = {
        theme:
            Counter()
        for theme
        in THEME_DEFINITIONS
    }


    theme_rows = {
        theme:
            []
        for theme
        in THEME_DEFINITIONS
    }


    theme_rows["other"] = []


    for _, row in constructive_df.iterrows():

        result = (
            classify_constructive_theme(
                row["Clean text"]
            )
        )


        theme_key = (
            result["theme"]
        )


        theme_counts[
            theme_key
        ] += 1


        if theme_key != "other":

            theme_terms[
                theme_key
            ].update(
                result[
                    "matched_terms"
                ]
            )


        theme_rows[
            theme_key
        ].append({

            "tweet_id":
                str(
                    row["Tweet ID"]
                ),

            "tanggal":
                str(
                    row["Tanggal"]
                ),

            "text":
                str(
                    row["Full text"]
                ),

            "confidence":
                round(
                    float(
                        row["Confidence"]
                    ),
                    2
                ),

            "score":
                int(
                    result["score"]
                )
        })


    themes = []


    for (
        theme_key,
        definition
    ) in THEME_DEFINITIONS.items():

        count = int(
            theme_counts[
                theme_key
            ]
        )


        if count == 0:
            continue


        percentage = round(
            count
            /
            total_constructive
            *
            100,
            2
        )


        examples = sorted(
            theme_rows[
                theme_key
            ],
            key=lambda item: (
                item["score"],
                item["confidence"]
            ),
            reverse=True
        )[:3]


        top_terms = [
            {
                "term":
                    term,

                "count":
                    int(count_value)
            }

            for term, count_value
            in theme_terms[
                theme_key
            ].most_common(5)
        ]


        themes.append({

            "theme":
                theme_key,

            "label":
                definition["label"],

            "count":
                count,

            "percentage":
                percentage,

            "description":
                definition[
                    "description"
                ],

            "direction":
                definition[
                    "direction"
                ],

            "top_terms":
                top_terms,

            "examples":
                examples
        })


    themes.sort(
        key=lambda item:
            item["count"],
        reverse=True
    )


    unclassified_count = int(
        theme_counts["other"]
    )


    classified_count = (
        total_constructive
        -
        unclassified_count
    )


    coverage_percent = (
        round(
            classified_count
            /
            total_constructive
            *
            100,
            2
        )
        if total_constructive
        else 0
    )


    if unclassified_count > 0:

        other_examples = sorted(
            theme_rows["other"],
            key=lambda item:
                item["confidence"],
            reverse=True
        )[:3]


        themes.append({

            "theme":
                "other",

            "label":
                "Masukan Lainnya",

            "count":
                unclassified_count,

            "percentage":
                round(
                    unclassified_count
                    /
                    total_constructive
                    *
                    100,
                    2
                ),

            "description":
                (
                    "Komentar pada kelompok ini belum "
                    "memiliki bukti tematik yang cukup "
                    "kuat untuk dimasukkan ke salah satu "
                    "kategori utama."
                ),

            "direction":
                (
                    "Komentar dapat ditinjau secara "
                    "individual karena mungkin mengandung "
                    "masukan yang lebih spesifik."
                ),

            "top_terms":
                [],

            "examples":
                other_examples
        })


    main_themes = [
        theme
        for theme in themes
        if theme["theme"]
        !=
        "other"
    ]


    summary_text = (
        build_summary_text(
            total_constructive,
            themes
        )
    )


    if main_themes:

        headline = (
            "Masukan publik terutama menyoroti "
            +
            main_themes[0][
                "label"
            ].lower()
        )

    else:

        headline = (
            "Masukan publik belum membentuk "
            "tema dominan"
        )


    key_points = []


    for (
        rank,
        theme
    ) in enumerate(
        main_themes[:4],
        start=1
    ):

        key_points.append({

            "rank":
                rank,

            "title":
                theme["label"],

            "count":
                theme["count"],

            "percentage":
                theme["percentage"],

            "description":
                theme["description"],

            "direction":
                theme["direction"],

            "examples":
                theme["examples"]
        })


    return {

        "total_constructive":
            total_constructive,

        "classified_count":
            classified_count,

        "unclassified_count":
            unclassified_count,

        "coverage_percent":
            coverage_percent,

        "headline":
            headline,

        "summary_text":
            summary_text,

        "themes":
            themes,

        "key_points":
            key_points
    }


# ============================================================
# 23. BUILD ANALYTICS
# ============================================================

def build_analytics(df):

    all_texts = (
        df["Clean text"]
        .tolist()
    )


    constructive_texts = (
        df.loc[
            df["Prediction ID"]
            ==
            1,
            "Clean text"
        ]
        .tolist()
    )


    nonconstructive_texts = (
        df.loc[
            df["Prediction ID"]
            ==
            0,
            "Clean text"
        ]
        .tolist()
    )


    bukan_kritik_texts = (
        df.loc[
            df["Prediction ID"]
            ==
            2,
            "Clean text"
        ]
        .tolist()
    )


    return {

        "trend":
            build_time_trend(
                df
            ),

        "top_words": {

            "all":
                get_top_words(
                    all_texts
                ),

            "konstruktif":
                get_top_words(
                    constructive_texts
                ),

            "nonkonstruktif":
                get_top_words(
                    nonconstructive_texts
                ),

            "bukan_kritik":
                get_top_words(
                    bukan_kritik_texts
                )
        },

        "top_phrases": {

            "konstruktif":
                get_top_bigrams(
                    constructive_texts
                ),

            "nonkonstruktif":
                get_top_bigrams(
                    nonconstructive_texts
                ),

            "bukan_kritik":
                get_top_bigrams(
                    bukan_kritik_texts
                )
        },

        "examples": {

            "konstruktif":
                get_examples(
                    df,
                    1,
                    8
                ),

            "nonkonstruktif":
                get_examples(
                    df,
                    0,
                    5
                ),

            "bukan_kritik":
                get_examples(
                    df,
                    2,
                    5
                )
        },

        "confidence_distribution":
            build_confidence_distribution(
                df
            ),

        "constructive_insight":
            build_constructive_insight(
                df
            )
    }


# ============================================================
# 24. HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "status":
            "online",

        "application":
            "MBG Insight API",

        "version":
            "1.5.0",

        "model":
            "IndoBERT Seed 42 - Model Final Penelitian",

        "device":
            str(DEVICE),

        "max_length":
            MAX_LENGTH,

        "head_tail":
            "191 + 191",

        "num_labels":
            len(LABEL_MAP),

        "labels":
            LABEL_MAP,

        "batch_size":
            BATCH_SIZE,

        "analytics":
            True,

        "thematic_insight":
            True,

        "progress_mode":
            "background-job-v1"
    }


# ============================================================
# 25. PREDICT ENDPOINT
# ============================================================

@app.post("/predict")
def predict(
    request: PredictRequest
):

    try:

        return {
            "success":
                True,

            "result":
                predict_text(
                    request.text
                )
        }


    except Exception as error:

        return {
            "success":
                False,

            "error":
                str(error)
        }


# ============================================================
# 26. ANALYZE CSV ENDPOINT
# ============================================================

@app.post("/analyze-csv")
async def analyze_csv(
    file: UploadFile = File(...)
):

    try:

        filename = (
            file.filename
            or ""
        )


        if not filename.lower().endswith(
            ".csv"
        ):

            raise ValueError(
                "Berkas harus berformat CSV."
            )


        file_bytes = (
            await file.read()
        )


        if not file_bytes:

            raise ValueError(
                "Berkas CSV kosong."
            )


        df = read_csv_file(
            file_bytes
        )


        df = normalize_columns(
            df
        )


        total_awal = len(df)


        df["Clean text"] = (
            df["Clean text"]
            .fillna("")
            .astype(str)
            .str.strip()
        )


        df = (
            df[
                df["Clean text"]
                !=
                ""
            ]
            .copy()
        )


        total_valid = len(df)

        total_dihapus = (
            total_awal
            -
            total_valid
        )


        if total_valid == 0:

            raise ValueError(
                "Tidak terdapat Clean text "
                "yang dapat dianalisis."
            )


        texts = (
            df["Clean text"]
            .tolist()
        )


        print("")
        print("=" * 70)
        print(
            f"ANALISIS CSV: {filename}"
        )
        print(
            f"Jumlah data : {total_valid}"
        )
        print("=" * 70)


        # -------------------------------------------------------
        # Jalankan inferensi di worker thread.
        # Tujuannya agar event loop FastAPI tetap bebas melayani
        # endpoint polling progress selama PyTorch bekerja.
        # -------------------------------------------------------

        update_active_analysis_stage(
            stage="Menyiapkan klasifikasi IndoBERT",
            progress=6,
            processed=0,
            total=total_valid
        )


        results = await asyncio.to_thread(
            predict_batch,
            texts
        )


        update_active_analysis_stage(
            stage="Menyusun hasil klasifikasi",
            progress=92,
            processed=total_valid,
            total=total_valid
        )


        print(
            "✅ Klasifikasi IndoBERT selesai."
        )


        df["Prediction ID"] = [
            item["prediction_id"]
            for item in results
        ]


        df["Prediksi"] = [
            item["label"]
            for item in results
        ]


        df["Confidence"] = [
            item[
                "confidence_percent"
            ]
            for item in results
        ]


        df["Prob Nonkonstruktif"] = [
            round(
                item[
                    "prob_nonkonstruktif"
                ]
                *
                100,
                2
            )
            for item in results
        ]


        df["Prob Konstruktif"] = [
            round(
                item[
                    "prob_konstruktif"
                ]
                *
                100,
                2
            )
            for item in results
        ]


        df["Prob Bukan Kritik"] = [
            round(
                item[
                    "prob_bukan_kritik"
                ]
                *
                100,
                2
            )
            for item in results
        ]


        df["Panjang Token"] = [
            item[
                "token_length"
            ]
            for item in results
        ]


        df["Head-Tail"] = [
            item[
                "head_tail_applied"
            ]
            for item in results
        ]


        jumlah_nonkonstruktif = int(
            (
                df["Prediction ID"]
                ==
                0
            ).sum()
        )


        jumlah_konstruktif = int(
            (
                df["Prediction ID"]
                ==
                1
            ).sum()
        )


        jumlah_bukan_kritik = int(
            (
                df["Prediction ID"]
                ==
                2
            ).sum()
        )


        persen_nonkonstruktif = round(
            jumlah_nonkonstruktif
            /
            total_valid
            *
            100,
            2
        )


        persen_konstruktif = round(
            jumlah_konstruktif
            /
            total_valid
            *
            100,
            2
        )


        persen_bukan_kritik = round(
            jumlah_bukan_kritik
            /
            total_valid
            *
            100,
            2
        )


        average_confidence = round(
            float(
                df[
                    "Confidence"
                ].mean()
            ),
            2
        )


        jumlah_head_tail = int(
            df["Head-Tail"].sum()
        )


        print(
            "Membangun analytics..."
        )


        update_active_analysis_stage(
            stage="Membangun ringkasan dan visualisasi",
            progress=95,
            processed=total_valid,
            total=total_valid
        )


        analytics = await asyncio.to_thread(
            build_analytics,
            df
        )


        update_active_analysis_stage(
            stage="Menyiapkan hasil dashboard",
            progress=98,
            processed=total_valid,
            total=total_valid
        )


        insight = (
            analytics[
                "constructive_insight"
            ]
        )


        print(
            "✅ Analytics selesai."
        )

        print(
            f"Constructive       : "
            f"{insight['total_constructive']}"
        )

        print(
            f"Terpetakan tema    : "
            f"{insight['classified_count']}"
        )

        print(
            f"Masukan lainnya    : "
            f"{insight['unclassified_count']}"
        )

        print(
            f"Coverage insight   : "
            f"{insight['coverage_percent']}%"
        )

        print(
            f"Headline           : "
            f"{insight['headline']}"
        )


        output_columns = [
            "Tweet ID",
            "Tanggal",
            "Full text",
            "Clean text",
            "Prediction ID",
            "Prediksi",
            "Confidence",
            "Prob Nonkonstruktif",
            "Prob Konstruktif",
            "Prob Bukan Kritik",
            "Panjang Token",
            "Head-Tail"
        ]


        output_df = (
            df[
                output_columns
            ]
            .copy()
        )


        output_df = (
            output_df
            .astype(object)
            .where(
                pd.notna(
                    output_df
                ),
                None
            )
        )


        return {

            "success":
                True,

            "filename":
                filename,

            "summary": {

                "total_awal":
                    total_awal,

                "total_valid":
                    total_valid,

                "total_dihapus":
                    total_dihapus,

                "konstruktif":
                    jumlah_konstruktif,

                "nonkonstruktif":
                    jumlah_nonkonstruktif,

                "bukan_kritik":
                    jumlah_bukan_kritik,

                "persen_konstruktif":
                    persen_konstruktif,

                "persen_nonkonstruktif":
                    persen_nonkonstruktif,

                "persen_bukan_kritik":
                    persen_bukan_kritik,

                "average_confidence":
                    average_confidence,

                "head_tail_applied":
                    jumlah_head_tail
            },

            "analytics":
                analytics,

            "data":
                output_df.to_dict(
                    orient="records"
                )
        }


    except Exception as error:

        print(
            "❌ ANALYZE CSV ERROR:"
        )

        print(
            str(error)
        )


        return {
            "success":
                False,

            "error":
                str(error)
        }


# ============================================================
# 27. REAL-TIME ANALYSIS PROGRESS
#
# Progress dibuat sebagai side-channel.
# Endpoint utama /analyze-csv tetap digunakan seperti sebelumnya,
# sehingga alur klasifikasi dan hasil API tidak berubah.
# ============================================================

ANALYSIS_PROGRESS_JOBS = {}

ANALYSIS_PROGRESS_LOCK = (
    threading.Lock()
)

ANALYSIS_PROGRESS_TTL_SECONDS = (
    30 * 60
)

ACTIVE_ANALYSIS_JOB_ID = None


def cleanup_analysis_progress_jobs():

    global ACTIVE_ANALYSIS_JOB_ID


    now = time.time()


    with ANALYSIS_PROGRESS_LOCK:

        expired_ids = [
            job_id
            for job_id, job
            in ANALYSIS_PROGRESS_JOBS.items()
            if (
                now
                -
                job["created_at"]
            )
            >
            ANALYSIS_PROGRESS_TTL_SECONDS
        ]


        for job_id in expired_ids:

            ANALYSIS_PROGRESS_JOBS.pop(
                job_id,
                None
            )


            if (
                ACTIVE_ANALYSIS_JOB_ID
                ==
                job_id
            ):

                ACTIVE_ANALYSIS_JOB_ID = (
                    None
                )


def update_active_analysis_stage(
    stage,
    progress,
    processed=None,
    total=None
):

    global ACTIVE_ANALYSIS_JOB_ID


    with ANALYSIS_PROGRESS_LOCK:

        job_id = (
            ACTIVE_ANALYSIS_JOB_ID
        )


        if not job_id:
            return


        job = (
            ANALYSIS_PROGRESS_JOBS
            .get(
                job_id
            )
        )


        if job is None:
            return


        update_data = {
            "status":
                "running",

            "stage":
                str(stage),

            "progress":
                max(
                    0,
                    min(
                        99,
                        int(progress)
                    )
                ),

            "updated_at":
                time.time()
        }


        if processed is not None:

            update_data[
                "processed"
            ] = int(processed)


        if total is not None:

            update_data[
                "total"
            ] = int(total)


        job.update(
            update_data
        )


def report_active_analysis_progress(
    processed,
    total
):

    global ACTIVE_ANALYSIS_JOB_ID


    if total <= 0:
        return


    with ANALYSIS_PROGRESS_LOCK:

        job_id = (
            ACTIVE_ANALYSIS_JOB_ID
        )


        if not job_id:
            return


        job = (
            ANALYSIS_PROGRESS_JOBS
            .get(
                job_id
            )
        )


        if job is None:
            return


        ratio = (
            processed
            /
            total
        )


        progress_value = (
            8
            +
            round(
                ratio * 82
            )
        )


        if processed < total:

            stage = (
                "Klasifikasi dengan IndoBERT"
            )

        else:

            stage = (
                "Menyusun ringkasan dan visualisasi"
            )


        job.update({
            "status":
                "running",

            "stage":
                stage,

            "progress":
                min(
                    int(
                        progress_value
                    ),
                    90
                ),

            "processed":
                int(
                    processed
                ),

            "total":
                int(
                    total
                ),

            "updated_at":
                time.time()
        })


@app.post(
    "/analyze-csv/progress/register"
)
def register_analysis_progress():

    global ACTIVE_ANALYSIS_JOB_ID


    cleanup_analysis_progress_jobs()


    job_id = (
        uuid.uuid4().hex
    )


    now = time.time()


    with ANALYSIS_PROGRESS_LOCK:

        ANALYSIS_PROGRESS_JOBS[
            job_id
        ] = {
            "job_id":
                job_id,

            "status":
                "running",

            "stage":
                "Menyiapkan dataset",

            "progress":
                2,

            "processed":
                0,

            "total":
                0,

            "created_at":
                now,

            "updated_at":
                now
        }


        ACTIVE_ANALYSIS_JOB_ID = (
            job_id
        )


    return {
        "success":
            True,

        "job_id":
            job_id
    }


@app.get(
    "/analyze-csv/progress/{job_id}"
)
def get_analysis_progress(
    job_id: str
):

    cleanup_analysis_progress_jobs()


    with ANALYSIS_PROGRESS_LOCK:

        job = (
            ANALYSIS_PROGRESS_JOBS
            .get(
                job_id
            )
        )


        if job is None:

            return {
                "success":
                    False,

                "error":
                    "Progress analisis tidak ditemukan "
                    "atau sudah kedaluwarsa."
            }


        return JSONResponse(
            content={
                "success":
                    True,

                "job_id":
                    job[
                        "job_id"
                    ],

                "status":
                    job[
                        "status"
                    ],

                "stage":
                    job[
                        "stage"
                    ],

                "progress":
                    job[
                        "progress"
                    ],

                "processed":
                    job[
                        "processed"
                    ],

                "total":
                    job[
                        "total"
                    ]
            },
            headers={
                "Cache-Control":
                    "no-store, no-cache, must-revalidate, max-age=0",

                "Pragma":
                    "no-cache",

                "Expires":
                    "0"
            }
        )


@app.post(
    "/analyze-csv/progress/{job_id}/complete"
)
def complete_analysis_progress(
    job_id: str
):

    global ACTIVE_ANALYSIS_JOB_ID


    with ANALYSIS_PROGRESS_LOCK:

        job = (
            ANALYSIS_PROGRESS_JOBS
            .get(
                job_id
            )
        )


        if job is None:

            return {
                "success":
                    False,

                "error":
                    "Progress analisis tidak ditemukan."
            }


        job.update({
            "status":
                "completed",

            "stage":
                "Analisis selesai",

            "progress":
                100,

            "processed":
                (
                    job[
                        "total"
                    ]
                    if job[
                        "total"
                    ] > 0
                    else job[
                        "processed"
                    ]
                ),

            "updated_at":
                time.time()
        })


        if (
            ACTIVE_ANALYSIS_JOB_ID
            ==
            job_id
        ):

            ACTIVE_ANALYSIS_JOB_ID = (
                None
            )


    return {
        "success":
            True
    }


# ============================================================
# 28. BACKGROUND ANALYSIS JOB
#
# Endpoint ini dipakai frontend untuk progress yang benar-benar
# mengikuti proses backend. Endpoint /analyze-csv lama tetap ada
# dan tidak diubah, sehingga kompatibilitas API sebelumnya tetap
# terjaga.
# ============================================================


def _run_analysis_job_background(
    job_id: str,
    filename: str,
    file_bytes: bytes
):

    global ACTIVE_ANALYSIS_JOB_ID


    try:

        with ANALYSIS_PROGRESS_LOCK:

            ACTIVE_ANALYSIS_JOB_ID = job_id

            job = ANALYSIS_PROGRESS_JOBS.get(job_id)

            if job is None:
                return

            job.update({
                "status": "running",
                "stage": "Membaca dan memvalidasi dataset",
                "progress": 4,
                "updated_at": time.time()
            })


        upload_file = UploadFile(
            file=BytesIO(file_bytes),
            filename=filename
        )


        result = asyncio.run(
            analyze_csv(upload_file)
        )


        if not result.get("success"):
            raise RuntimeError(
                result.get("error")
                or "Dataset tidak dapat dianalisis."
            )


        total_valid = int(
            result
            .get("summary", {})
            .get("total_valid", 0)
            or 0
        )


        with ANALYSIS_PROGRESS_LOCK:

            job = ANALYSIS_PROGRESS_JOBS.get(job_id)

            if job is not None:
                job.update({
                    "status": "completed",
                    "stage": "Analisis selesai",
                    "progress": 100,
                    "processed": total_valid,
                    "total": total_valid,
                    "result": result,
                    "error": None,
                    "updated_at": time.time()
                })


    except Exception as error:

        print("❌ BACKGROUND ANALYSIS ERROR:")
        print(str(error))


        with ANALYSIS_PROGRESS_LOCK:

            job = ANALYSIS_PROGRESS_JOBS.get(job_id)

            if job is not None:
                job.update({
                    "status": "failed",
                    "stage": "Analisis gagal",
                    "error": str(error),
                    "updated_at": time.time()
                })


    finally:

        with ANALYSIS_PROGRESS_LOCK:

            if ACTIVE_ANALYSIS_JOB_ID == job_id:
                ACTIVE_ANALYSIS_JOB_ID = None


@app.post("/analyze-csv/job/start")
async def start_analysis_job(
    file: UploadFile = File(...)
):

    global ACTIVE_ANALYSIS_JOB_ID


    cleanup_analysis_progress_jobs()


    filename = file.filename or ""


    if not filename.lower().endswith(".csv"):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Berkas harus berformat CSV."
            }
        )


    file_bytes = await file.read()


    if not file_bytes:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "Berkas CSV kosong."
            }
        )


    job_id = uuid.uuid4().hex
    now = time.time()


    with ANALYSIS_PROGRESS_LOCK:

        ANALYSIS_PROGRESS_JOBS[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "stage": "Menyiapkan dataset",
            "progress": 2,
            "processed": 0,
            "total": 0,
            "result": None,
            "error": None,
            "created_at": now,
            "updated_at": now
        }

        ACTIVE_ANALYSIS_JOB_ID = job_id


    worker = threading.Thread(
        target=_run_analysis_job_background,
        args=(job_id, filename, file_bytes),
        daemon=True
    )

    worker.start()


    return {
        "success": True,
        "job_id": job_id
    }


@app.get("/analyze-csv/job/{job_id}")
def get_analysis_job_status(
    job_id: str
):

    cleanup_analysis_progress_jobs()


    with ANALYSIS_PROGRESS_LOCK:

        job = ANALYSIS_PROGRESS_JOBS.get(job_id)


        if job is None:
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": (
                        "Job analisis tidak ditemukan "
                        "atau sudah kedaluwarsa."
                    )
                },
                headers={
                    "Cache-Control": "no-store"
                }
            )


        payload = {
            "success": True,
            "job_id": job["job_id"],
            "status": job["status"],
            "stage": job["stage"],
            "progress": job["progress"],
            "processed": job["processed"],
            "total": job["total"],
            "error": job.get("error"),
            "result": (
                job.get("result")
                if job["status"] == "completed"
                else None
            )
        }


    return JSONResponse(
        content=jsonable_encoder(payload),
        headers={
            "Cache-Control": (
                "no-store, no-cache, must-revalidate, max-age=0"
            ),
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
