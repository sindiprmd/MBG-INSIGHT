import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

import "./App.css"

import {
  generateMBGReport
} from "./pdfReport"


// ============================================================
// METRIK FINAL PENELITIAN
// ============================================================

const MODEL_METRICS = [
  {
    metric: "Accuracy",
    IndoBERT: 84.68,
    SVM: 75.08
  },
  {
    metric: "Precision",
    IndoBERT: 82.47,
    SVM: 73.90
  },
  {
    metric: "Recall",
    IndoBERT: 81.38,
    SVM: 71.16
  },
  {
    metric: "Macro-F1",
    IndoBERT: 81.89,
    SVM: 72.33
  }
]


const MODEL_SUMMARY = {
  accuracy: 84.68,
  precision: 82.47,
  recall: 81.38,
  macroF1: 81.89
}


const DISTRIBUTION_COLORS = [
  "#2563eb",
  "#0f766e",
  "#7c3aed"
]


const ANALYTICS_SECTIONS = [
  {
    id: "analysis-summary",
    label: "Ringkasan"
  },
  {
    id: "model-evaluation",
    label: "Evaluasi Model"
  },
  {
    id: "distribution",
    label: "Distribusi"
  },
  {
    id: "time-trend",
    label: "Tren Waktu"
  },
  {
    id: "words-topics",
    label: "Kata & Topik"
  },
  {
    id: "constructive-insight",
    label: "Insight Konstruktif"
  },
  {
    id: "data-preview",
    label: "Data Hasil"
  }
]


// ============================================================
// FORMATTER
// ============================================================

const formatNumber = (value) => {
  return Number(
    value || 0
  ).toLocaleString(
    "id-ID"
  )
}


const formatPercent = (
  value,
  decimals = 2
) => {
  return Number(
    value || 0
  ).toLocaleString(
    "id-ID",
    {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }
  )
}


// ============================================================
// PAGINATION
// ============================================================

const buildPaginationPages = (
  currentPage,
  totalPages
) => {

  if (totalPages <= 5) {
    return Array.from(
      {
        length: totalPages
      },
      (_, index) =>
        index + 1
    )
  }


  let startPage =
    currentPage - 2

  let endPage =
    currentPage + 2


  if (startPage < 1) {
    startPage = 1
    endPage = 5
  }


  if (endPage > totalPages) {
    endPage = totalPages
    startPage =
      totalPages - 4
  }


  return Array.from(
    {
      length:
        endPage -
        startPage +
        1
    },
    (_, index) =>
      startPage + index
  )
}


// ============================================================
// CSV HELPERS
// ============================================================

const protectCsvValue = (
  value
) => {

  if (
    value === null ||
    value === undefined
  ) {
    return ""
  }


  let text =
    String(value)


  // ----------------------------------------------------------
  // Mencegah isi CSV dibaca sebagai formula spreadsheet.
  // ----------------------------------------------------------

  if (
    /^[=+\-@]/.test(
      text
    )
  ) {
    text =
      `'${text}`
  }


  return text
}


const escapeCsvValue = (
  value
) => {

  const safeValue =
    protectCsvValue(
      value
    )


  return (
    `"${safeValue.replace(
      /"/g,
      '""'
    )}"`
  )
}


const buildCsvTimestamp = () => {

  const now =
    new Date()


  const pad = (
    value
  ) =>
    String(value)
      .padStart(
        2,
        "0"
      )


  return (
    `${now.getFullYear()}-` +
    `${pad(
      now.getMonth() + 1
    )}-` +
    `${pad(
      now.getDate()
    )}_` +
    `${pad(
      now.getHours()
    )}-` +
    `${pad(
      now.getMinutes()
    )}`
  )
}


const sanitizeFileBaseName = (
  filename
) => {

  const withoutExtension =
    String(
      filename ||
      "dataset"
    )
      .replace(
        /\.csv$/i,
        ""
      )


  const sanitized =
    withoutExtension
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )


  return (
    sanitized
      .slice(
        0,
        60
      )
    ||
    "dataset"
  )
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  value,
  label,
  accent = "blue"
}) {

  return (
    <div
      className={
        `summary-card ${accent}`
      }
    >

      <div className="summary-card-icon">
        {icon}
      </div>


      <div className="summary-card-content">

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

      </div>

    </div>
  )
}


// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  label,
  value
}) {

  return (
    <div className="metric-card">

      <span>
        {label}
      </span>

      <strong>
        {formatPercent(value)}%
      </strong>

    </div>
  )
}


// ============================================================
// WORD CLOUD
// ============================================================

function WordCloud({
  words
}) {

  const maxCount =
    Math.max(
      ...words.map(
        (item) =>
          item.count
      ),
      1
    )


  if (!words.length) {

    return (
      <div className="empty-state">
        Tidak terdapat data kata untuk ditampilkan.
      </div>
    )
  }


  return (
    <div className="word-cloud">

      {words
        .slice(
          0,
          25
        )
        .map(
          (
            item,
            index
          ) => {

            const ratio =
              item.count /
              maxCount


            const fontSize =
              12 +
              Math.round(
                ratio * 22
              )


            return (
              <span
                key={
                  `${item.word}-${index}`
                }
                className="word-cloud-item"
                style={{
                  fontSize:
                    `${fontSize}px`,

                  opacity:
                    0.55 +
                    ratio * 0.45
                }}
                title={
                  `${item.word}: ${item.count} kali`
                }
              >
                {item.word}
              </span>
            )
          }
        )}

    </div>
  )
}


// ============================================================
// APP
// ============================================================

function App() {

  // =========================================================
  // MODAL UJI TEKS
  // =========================================================

  const [
    isTestModalOpen,
    setIsTestModalOpen
  ] = useState(false)


  const [
    testText,
    setTestText
  ] = useState("")


  const [
    testResult,
    setTestResult
  ] = useState(null)


  const [
    testLoading,
    setTestLoading
  ] = useState(false)


  const [
    testError,
    setTestError
  ] = useState("")


  // =========================================================
  // UPLOAD CSV
  // =========================================================

  const fileInputRef =
    useRef(null)


  const [
    selectedFile,
    setSelectedFile
  ] = useState(null)


  const [
    uploadError,
    setUploadError
  ] = useState("")


  const [
    analysisLoading,
    setAnalysisLoading
  ] = useState(false)


  const [
    analysisResult,
    setAnalysisResult
  ] = useState(null)


  const [
    analysisProgress,
    setAnalysisProgress
  ] = useState({
    progress: 0,
    stage: "",
    processed: 0,
    total: 0
  })


  // =========================================================
  // PDF REPORT
  // =========================================================

  const [
    reportGenerating,
    setReportGenerating
  ] = useState(false)


  const [
    reportError,
    setReportError
  ] = useState("")


  // =========================================================
  // DASHBOARD
  // =========================================================

  const [
    activeSection,
    setActiveSection
  ] = useState(
    "analysis-summary"
  )


  const [
    wordFilter,
    setWordFilter
  ] = useState("all")


  // =========================================================
  // DATA HASIL
  // =========================================================

  const [
    dataSearch,
    setDataSearch
  ] = useState("")


  const [
    predictionFilter,
    setPredictionFilter
  ] = useState("all")


  const [
    confidenceFilter,
    setConfidenceFilter
  ] = useState("all")


  const [
    rowsPerPage,
    setRowsPerPage
  ] = useState(10)


  const [
    currentPage,
    setCurrentPage
  ] = useState(1)


  // =========================================================
  // BODY SCROLL
  // =========================================================

  useEffect(() => {

    document.body.style.overflow =
      (
        isTestModalOpen ||
        reportGenerating
      )
        ? "hidden"
        : ""


    return () => {
      document.body.style.overflow =
        ""
    }

  }, [
    isTestModalOpen,
    reportGenerating
  ])


  // =========================================================
  // SCROLL SPY
  // =========================================================

  useEffect(() => {

    if (!analysisResult) {
      return
    }


    const updateActiveSection = () => {

      const markerPosition =
        165


      let currentSection =
        ANALYTICS_SECTIONS[0]
          .id


      for (
        const section
        of ANALYTICS_SECTIONS
      ) {

        const element =
          document.getElementById(
            section.id
          )


        if (!element) {
          continue
        }


        const rect =
          element
            .getBoundingClientRect()


        if (
          rect.top <=
          markerPosition
        ) {
          currentSection =
            section.id
        }
      }


      setActiveSection(
        currentSection
      )
    }


    updateActiveSection()


    window.addEventListener(
      "scroll",
      updateActiveSection,
      {
        passive: true
      }
    )


    window.addEventListener(
      "resize",
      updateActiveSection
    )


    return () => {

      window.removeEventListener(
        "scroll",
        updateActiveSection
      )


      window.removeEventListener(
        "resize",
        updateActiveSection
      )

    }

  }, [
    analysisResult
  ])


  // =========================================================
  // RESET PAGE SAAT FILTER BERUBAH
  // =========================================================

  useEffect(() => {

    setCurrentPage(1)

  }, [
    dataSearch,
    predictionFilter,
    confidenceFilter,
    rowsPerPage
  ])


  // =========================================================
  // DISTRIBUSI
  // =========================================================

  const distributionData =
    useMemo(() => {

      if (!analysisResult) {
        return []
      }


      return [
        {
          name:
            "Konstruktif",

          value:
            Number(
              analysisResult
                .summary
                .konstruktif
              || 0
            )
        },

        {
          name:
            "Nonkonstruktif",

          value:
            Number(
              analysisResult
                .summary
                .nonkonstruktif
              || 0
            )
        },

        {
          name:
            "Tidak Layak/Bukan Kritik",

          value:
            Number(
              analysisResult
                .summary
                .bukan_kritik
              || 0
            )
        }
      ]

    }, [
      analysisResult
    ])


  // =========================================================
  // ANALYTICS DATA
  // =========================================================

  const trendData =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.trend
          ?.data
        ||
        []
      )

    }, [
      analysisResult
    ])


  const confidenceData =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.confidence_distribution
        ||
        []
      )

    }, [
      analysisResult
    ])


  const currentTopWords =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.top_words
          ?.[wordFilter]
        ||
        []
      )

    }, [
      analysisResult,
      wordFilter
    ])


  const constructivePhrases =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.top_phrases
          ?.konstruktif
        ||
        []
      )

    }, [
      analysisResult
    ])


  const constructiveExamples =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.examples
          ?.konstruktif
        ||
        []
      )

    }, [
      analysisResult
    ])


  const constructiveInsight =
    useMemo(() => {

      return (
        analysisResult
          ?.analytics
          ?.constructive_insight
        ||
        null
      )

    }, [
      analysisResult
    ])


  const constructiveThemes =
    useMemo(() => {

      return (
        constructiveInsight
          ?.themes
        ||
        []
      )

    }, [
      constructiveInsight
    ])


  // =========================================================
  // FILTER DATA HASIL
  // =========================================================

  const filteredData =
    useMemo(() => {

      const allData =
        analysisResult
          ?.data
        ||
        []


      const normalizedSearch =
        dataSearch
          .trim()
          .toLowerCase()


      return allData.filter(
        (item) => {

          // --------------------------------------------------
          // SEARCH
          // --------------------------------------------------

          const searchableText = [
            item["Tweet ID"],
            item["Tanggal"],
            item["Full text"],
            item["Clean text"],
            item["Prediksi"]
          ]
            .map(
              (value) =>
                String(
                  value ?? ""
                )
                  .toLowerCase()
            )
            .join(" ")


          const matchSearch =
            !normalizedSearch
            ||
            searchableText
              .includes(
                normalizedSearch
              )


          // --------------------------------------------------
          // FILTER PREDICTION
          // --------------------------------------------------

          const predictionId =
            Number(
              item[
                "Prediction ID"
              ]
            )


          const matchPrediction =
            predictionFilter ===
            "all"
            ||
            (
              predictionFilter ===
              "constructive"
              &&
              predictionId === 1
            )
            ||
            (
              predictionFilter ===
              "nonconstructive"
              &&
              predictionId === 0
            )
            ||
            (
              predictionFilter ===
              "not-criticism"
              &&
              predictionId === 2
            )


          // --------------------------------------------------
          // FILTER CONFIDENCE
          // --------------------------------------------------

          const confidence =
            Number(
              item[
                "Confidence"
              ]
              ||
              0
            )


          let matchConfidence =
            true


          if (
            confidenceFilter ===
            "high"
          ) {

            matchConfidence =
              confidence >=
              90
          }


          if (
            confidenceFilter ===
            "medium"
          ) {

            matchConfidence =
              confidence >=
              70
              &&
              confidence <
              90
          }


          if (
            confidenceFilter ===
            "low"
          ) {

            matchConfidence =
              confidence <
              70
          }


          return (
            matchSearch
            &&
            matchPrediction
            &&
            matchConfidence
          )
        }
      )

    }, [
      analysisResult,
      dataSearch,
      predictionFilter,
      confidenceFilter
    ])


  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredData.length /
        rowsPerPage
      )
    )


  useEffect(() => {

    if (
      currentPage >
      totalPages
    ) {

      setCurrentPage(
        totalPages
      )
    }

  }, [
    currentPage,
    totalPages
  ])


  const paginatedData =
    useMemo(() => {

      const startIndex =
        (
          currentPage -
          1
        )
        *
        rowsPerPage


      return filteredData
        .slice(
          startIndex,
          startIndex +
          rowsPerPage
        )

    }, [
      filteredData,
      currentPage,
      rowsPerPage
    ])


  const paginationPages =
    useMemo(() => {

      return buildPaginationPages(
        currentPage,
        totalPages
      )

    }, [
      currentPage,
      totalPages
    ])


  const firstVisibleItem =
    filteredData.length
      ?
      (
        (
          currentPage -
          1
        )
        *
        rowsPerPage
      )
      +
      1
      :
      0


  const lastVisibleItem =
    Math.min(
      currentPage *
      rowsPerPage,
      filteredData.length
    )


  const hasActiveDataFilter =
    (
      dataSearch.trim() !== ""
      ||
      predictionFilter !==
      "all"
      ||
      confidenceFilter !==
      "all"
    )


  // =========================================================
  // RESET FILTER
  // =========================================================

  const handleResetDataFilters =
    () => {

      setDataSearch("")

      setPredictionFilter(
        "all"
      )

      setConfidenceFilter(
        "all"
      )

      setCurrentPage(1)
    }


  // =========================================================
  // EXPORT CSV
  // =========================================================

  const downloadResultCsv = (
    rows,
    mode = "lengkap"
  ) => {

    if (
      !rows ||
      rows.length === 0
    ) {

      return
    }


    const columns = [
      {
        header:
          "Tweet ID",

        key:
          "Tweet ID"
      },

      {
        header:
          "Tanggal",

        key:
          "Tanggal"
      },

      {
        header:
          "Full text",

        key:
          "Full text"
      },

      {
        header:
          "Clean text",

        key:
          "Clean text"
      },

      {
        header:
          "Prediction ID",

        key:
          "Prediction ID"
      },

      {
        header:
          "Prediksi",

        key:
          "Prediksi"
      },

      {
        header:
          "Confidence (%)",

        key:
          "Confidence"
      },

      {
        header:
          "Prob Nonkonstruktif (%)",

        key:
          "Prob Nonkonstruktif"
      },

      {
        header:
          "Prob Konstruktif (%)",

        key:
          "Prob Konstruktif"
      },

      {
        header:
          "Prob Bukan Kritik (%)",

        key:
          "Prob Bukan Kritik"
      },

      {
        header:
          "Panjang Token",

        key:
          "Panjang Token"
      },

      {
        header:
          "Head-Tail",

        key:
          "Head-Tail"
      }
    ]


    const headerRow =
      columns
        .map(
          (column) =>
            escapeCsvValue(
              column.header
            )
        )
        .join(",")


    const dataRows =
      rows.map(
        (item) => {

          return columns
            .map(
              (column) => {

                let value =
                  item[
                    column.key
                  ]


                if (
                  column.key ===
                  "Head-Tail"
                ) {

                  value =
                    value === true
                    ||
                    String(value)
                      .toLowerCase() ===
                      "true"
                      ?
                      "Ya"
                      :
                      "Tidak"
                }


                return escapeCsvValue(
                  value
                )
              }
            )
            .join(",")
        }
      )


    const csvContent =
      [
        headerRow,
        ...dataRows
      ]
        .join("\r\n")


    const blob =
      new Blob(
        [
          "\uFEFF",
          csvContent
        ],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      )


    const url =
      URL.createObjectURL(
        blob
      )


    const link =
      document.createElement(
        "a"
      )


    const datasetName =
      sanitizeFileBaseName(
        analysisResult
          ?.filename
        ||
        selectedFile
          ?.name
      )


    const timestamp =
      buildCsvTimestamp()


    const modeName =
      mode === "filter"
        ?
        "HASIL_FILTER"
        :
        "HASIL_KLASIFIKASI"


    link.href =
      url


    link.download =
      (
        `MBG_INSIGHT_${modeName}_` +
        `${datasetName}_` +
        `${timestamp}.csv`
      )


    document.body
      .appendChild(
        link
      )


    link.click()


    document.body
      .removeChild(
        link
      )


    URL.revokeObjectURL(
      url
    )
  }


  const handleDownloadFullCsv =
    () => {

      downloadResultCsv(
        analysisResult
          ?.data
        ||
        [],
        "lengkap"
      )
    }


  const handleDownloadFilteredCsv =
    () => {

      downloadResultCsv(
        filteredData,
        "filter"
      )
    }


  // =========================================================
  // PDF REPORT
  // =========================================================

  const handleDownloadReport =
    async () => {

      if (
        !analysisResult ||
        reportGenerating
      ) {
        return
      }


      setReportGenerating(
        true
      )

      setReportError("")


      try {

        const result =
          await generateMBGReport({
            analysisResult,
            constructiveInsight
          })


        console.log(
          "PDF Report berhasil dibuat:",
          result
        )

      }

      catch (error) {

        console.error(
          "Gagal membuat PDF:",
          error
        )


        setReportError(
          error?.message
          ||
          "Laporan PDF tidak dapat dibuat."
        )

      }

      finally {

        setReportGenerating(
          false
        )

      }
    }


  // =========================================================
  // MODAL
  // =========================================================

  const openTestModal = () => {

    setIsTestModalOpen(
      true
    )

    setTestText("")

    setTestResult(
      null
    )

    setTestError("")
  }


  const closeTestModal = () => {

    if (testLoading) {
      return
    }


    setIsTestModalOpen(
      false
    )

    setTestText("")

    setTestResult(
      null
    )

    setTestError("")
  }


  // =========================================================
  // SINGLE TEXT PREDICTION
  // =========================================================

  const handleTestPrediction =
    async () => {

      const cleanInput =
        testText.trim()


      if (!cleanInput) {

        setTestError(
          "Masukkan teks opini terlebih dahulu."
        )

        return
      }


      if (
        cleanInput.length <
        10
      ) {

        setTestError(
          "Masukkan opini yang lebih lengkap mengenai Program MBG."
        )

        return
      }


      setTestLoading(
        true
      )

      setTestError("")

      setTestResult(
        null
      )


      try {

        const response =
          await fetch(
            "http://127.0.0.1:8000/predict",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  text:
                    cleanInput
                })
            }
          )


        if (!response.ok) {

          throw new Error(
            `HTTP ${response.status}`
          )
        }


        const data =
          await response.json()


        if (!data.success) {

          throw new Error(
            data.error
            ||
            "Prediksi tidak berhasil."
          )
        }


        setTestResult(
          data.result
        )

      }

      catch (error) {

        console.error(
          error
        )


        setTestError(
          "Tidak dapat menghubungi model IndoBERT. Pastikan backend FastAPI aktif."
        )

      }

      finally {

        setTestLoading(
          false
        )

      }
    }


  const handleTextareaKeyDown =
    (event) => {

      if (
        event.ctrlKey
        &&
        event.key ===
        "Enter"
      ) {

        event.preventDefault()

        handleTestPrediction()
      }
    }


  // =========================================================
  // FILE PICKER
  // =========================================================

  const handleChooseFile =
    () => {

      if (
        analysisLoading
      ) {
        return
      }


      setUploadError("")


      fileInputRef
        .current
        ?.click()
    }


  // =========================================================
  // FILE CHANGE
  // =========================================================

  const handleFileChange =
    (event) => {

      const file =
        event
          .target
          .files?.[0]


      if (!file) {
        return
      }


      if (
        !file
          .name
          .toLowerCase()
          .endsWith(".csv")
      ) {

        setSelectedFile(
          null
        )

        setAnalysisResult(
          null
        )

        setUploadError(
          "Format berkas tidak didukung. Gunakan file CSV."
        )

        event.target.value =
          ""

        return
      }


      setSelectedFile(
        file
      )

      setAnalysisResult(
        null
      )

      setAnalysisProgress({
        progress: 0,
        stage: "",
        processed: 0,
        total: 0
      })

      setUploadError("")

      setReportError("")

      handleResetDataFilters()
    }


  // =========================================================
  // FILE SIZE
  // =========================================================

  const formatFileSize =
    (bytes) => {

      if (
        bytes <
        1024
      ) {

        return `${bytes} B`
      }


      if (
        bytes <
        1024 *
        1024
      ) {

        return `${(
          bytes /
          1024
        ).toFixed(1)} KB`
      }


      return `${(
        bytes /
        (
          1024 *
          1024
        )
      ).toFixed(2)} MB`
    }


  // =========================================================
  // ANALYZE CSV
  // =========================================================

  const handleAnalyzeCsv =
    async () => {

      if (
        !selectedFile
      ) {

        setUploadError(
          "Pilih dataset CSV terlebih dahulu."
        )

        return
      }


      setAnalysisLoading(
        true
      )

      setAnalysisProgress({
        progress: 2,
        stage: "Menyiapkan dataset",
        processed: 0,
        total: 0
      })

      setUploadError("")
      setReportError("")
      setAnalysisResult(null)


      try {

        const formData =
          new FormData()


        formData.append(
          "file",
          selectedFile
        )


        // -----------------------------------------------------
        // Memulai job analisis di backend. Request ini langsung
        // mengembalikan job_id, sehingga frontend tidak perlu
        // menunggu seluruh inferensi selesai dalam satu request.
        // -----------------------------------------------------

        const startResponse =
          await fetch(
            "http://127.0.0.1:8000/analyze-csv/job/start",
            {
              method: "POST",
              body: formData,
              cache: "no-store"
            }
          )


        const startData =
          await startResponse.json()


        if (
          !startResponse.ok ||
          !startData.success
        ) {

          throw new Error(
            startData.error
            ||
            `HTTP ${startResponse.status}`
          )
        }


        const jobId =
          startData.job_id

        const startedAt =
          Date.now()


        while (true) {

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                180
              )
          )


          const statusResponse =
            await fetch(
              `http://127.0.0.1:8000/analyze-csv/job/${jobId}?_=${Date.now()}`,
              {
                cache: "no-store"
              }
            )


          const statusData =
            await statusResponse.json()


          if (
            !statusResponse.ok ||
            !statusData.success
          ) {

            throw new Error(
              statusData.error
              ||
              `HTTP ${statusResponse.status}`
            )
          }


          setAnalysisProgress({
            progress: Number(
              statusData.progress
              ||
              0
            ),

            stage:
              statusData.stage
              ||
              "Menganalisis dataset",

            processed: Number(
              statusData.processed
              ||
              0
            ),

            total: Number(
              statusData.total
              ||
              0
            )
          })


          if (
            statusData.status ===
            "failed"
          ) {

            throw new Error(
              statusData.error
              ||
              "Dataset tidak dapat dianalisis."
            )
          }


          if (
            statusData.status ===
            "completed"
          ) {

            const data =
              statusData.result


            if (
              !data ||
              !data.success
            ) {

              throw new Error(
                data?.error
                ||
                "Hasil analisis tidak tersedia."
              )
            }


            setAnalysisProgress({
              progress: 100,
              stage: "Analisis selesai",
              processed:
                data.summary.total_valid,
              total:
                data.summary.total_valid
            })


            await new Promise(
              (resolve) =>
                setTimeout(
                  resolve,
                  400
                )
            )


            setAnalysisResult(
              data
            )

            setActiveSection(
              "analysis-summary"
            )

            setWordFilter(
              "all"
            )

            setDataSearch("")

            setPredictionFilter(
              "all"
            )

            setConfidenceFilter(
              "all"
            )

            setRowsPerPage(10)
            setCurrentPage(1)


            setTimeout(
              () => {
                scrollToSection(
                  "analysis-summary"
                )
              },
              150
            )


            break
          }


          if (
            Date.now() -
            startedAt >
            10 * 60 * 1000
          ) {

            throw new Error(
              "Proses analisis melebihi batas waktu 10 menit."
            )
          }
        }

      }

      catch (error) {

        console.error(
          error
        )

        setUploadError(
          error.message
          ||
          "Dataset tidak dapat dianalisis."
        )

      }

      finally {

        setAnalysisLoading(
          false
        )
      }
    }



  // =========================================================
  // SCROLL NAVIGATION
  // =========================================================

  const scrollToSection =
    (id) => {

      const element =
        document.getElementById(
          id
        )


      if (!element) {
        return
      }


      const stickyOffset =
        145


      const targetPosition =
        element
          .getBoundingClientRect()
          .top
        +
        window.scrollY
        -
        stickyOffset


      setActiveSection(
        id
      )


      window.scrollTo({
        top:
          targetPosition,

        behavior:
          "smooth"
      })
    }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <header className="main-navbar">

        <div className="navbar-container">

          <a
            href="#home"
            className="brand"
          >

            <div className="brand-icon">
              M
            </div>


            <div className="brand-text">

              <span className="brand-name">
                MBG Insight
              </span>

              <span className="brand-subtitle">
                IndoBERT Analytics
              </span>

            </div>

          </a>


          <nav className="navbar-menu">

            <a href="#home">
              Beranda
            </a>

            <a href="#tentang">
              Tentang Model
            </a>

            <button
              type="button"
              className="nav-button-text"
              onClick={
                openTestModal
              }
            >
              Uji Teks
            </button>

          </nav>


          <div className="navbar-actions">

            <a
              href="#upload"
              className="button-upload-nav"
            >
              Unggah Data
            </a>


            <button
              type="button"
              className={
                analysisResult
                  ?
                  "button-download active"
                  :
                  "button-download"
              }
              onClick={
                handleDownloadReport
              }
              disabled={
                !analysisResult
                ||
                reportGenerating
              }
              aria-busy={
                reportGenerating
              }
            >

              {reportGenerating
                ?
                "Membuat Laporan..."
                :
                "Download Laporan"}

            </button>

          </div>

        </div>

      </header>


      {/* =====================================================
          SECONDARY NAVBAR
      ====================================================== */}

      {analysisResult && (

        <nav className="analytics-navbar">

          <div className="analytics-navbar-container">

            {ANALYTICS_SECTIONS.map(
              (section) => (

                <button
                  key={
                    section.id
                  }
                  className={
                    activeSection ===
                    section.id
                      ?
                      "active"
                      :
                      ""
                  }
                  onClick={
                    () =>
                      scrollToSection(
                        section.id
                      )
                  }
                >
                  {section.label}
                </button>

              )
            )}

          </div>

        </nav>

      )}


      <main>

        {/* ===================================================
            HERO
        ==================================================== */}

        <section
          id="home"
          className="hero-section"
        >

          <div className="hero-background hero-background-left" />
          <div className="hero-background hero-background-right" />


          <div className="hero-content">

            <div className="hero-badge">
              Analisis Kritik Publik Berbasis IndoBERT
            </div>


            <h1>

              Memahami Kritik Publik

              <span>
                terhadap Program MBG
              </span>

            </h1>


            <p className="hero-description">

              Dashboard analitik untuk mengklasifikasikan teks terkait
              Program Makan Bergizi Gratis ke dalam tiga kategori,
              yaitu kritik konstruktif, kritik nonkonstruktif, dan
              tidak layak/bukan kritik berdasarkan data media sosial X.

            </p>


            <div className="hero-tags">

              <span>
                IndoBERT
              </span>

              <span>
                Klasifikasi 3 Kelas
              </span>

              <span>
                Konstruktif
              </span>

              <span>
                Nonkonstruktif
              </span>

              <span>
                Bukan Kritik
              </span>

              <span>
                Stateless Analysis
              </span>

            </div>


            <div className="hero-workflow">

              <div className="workflow-item">

                <div className="workflow-number">
                  01
                </div>

                <div className="workflow-text">

                  <strong>
                    Unggah CSV
                  </strong>

                  <span>
                    Data opini media sosial X
                  </span>

                </div>

              </div>


              <div className="workflow-arrow">
                →
              </div>


              <div className="workflow-item">

                <div className="workflow-number">
                  02
                </div>

                <div className="workflow-text">

                  <strong>
                    IndoBERT
                  </strong>

                  <span>
                    Klasifikasi otomatis
                  </span>

                </div>

              </div>


              <div className="workflow-arrow">
                →
              </div>


              <div className="workflow-item">

                <div className="workflow-number">
                  03
                </div>

                <div className="workflow-text">

                  <strong>
                    Insight Kritik
                  </strong>

                  <span>
                    Masukan konstruktif
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            UPLOAD
        ====================================================== */}

        <section
          id="upload"
          className="upload-section"
        >

          <div className="section-heading">

            <span className="section-label">
              MULAI ANALISIS
            </span>

            <h2>
              Unggah Dataset
            </h2>

            <p>

              Masukkan dataset CSV berisi opini atau kritik
              mengenai Program Makan Bergizi Gratis yang
              telah melalui tahap penyaringan relevansi.

            </p>

          </div>


          <div className="upload-card">

            <div className="upload-icon">

              {analysisResult
                ?
                "✓"
                :
                "↑"}

            </div>


            <h3>

              {!selectedFile
                ?
                "Unggah Dataset CSV"
                :
                analysisResult
                  ?
                  "Analisis Dataset Selesai"
                  :
                  "Dataset Dipilih"}

            </h3>


            <p>

              {!selectedFile
                ?
                (
                  <>
                    Pilih dataset dengan kolom
                    Tweet ID, Tanggal,
                    Full text, dan Clean text.
                  </>
                )
                :
                (
                  <>
                    {selectedFile.name}

                    {" • "}

                    {formatFileSize(
                      selectedFile.size
                    )}
                  </>
                )}

            </p>


            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".csv,text/csv"
              onChange={
                handleFileChange
              }
              hidden
            />


            <div className="test-scope-notice upload-scope">

              <div className="scope-notice-icon">
                i
              </div>


              <div className="scope-notice-content">

                <strong>
                  Ruang Lingkup Dataset
                </strong>

                <p>

                  Dataset dapat berisi opini atau kritik
                  terkait Program Makan Bergizi Gratis yang
                  telah melalui penyaringan relevansi. Model
                  mengklasifikasikan teks ke dalam tiga kategori,
                  yaitu Kritik Nonkonstruktif, Kritik Konstruktif,
                  dan Tidak Layak/Bukan Kritik.

                </p>

              </div>

            </div>


            {analysisLoading && (

              <div
                className="upload-progress-card"
                role="status"
                aria-live="polite"
              >

                <div className="upload-progress-header">

                  <div>

                    <strong>
                      Menganalisis Dataset
                    </strong>

                    <span>
                      {analysisProgress.stage
                        ||
                        "Menyiapkan dataset"}
                    </span>

                  </div>


                  <strong className="upload-progress-percent">

                    {Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          analysisProgress.progress
                          ||
                          0
                        )
                      )
                    )}

                    {"%"}

                  </strong>

                </div>


                <div
                  className="upload-progress-track"
                  aria-hidden="true"
                >

                  <div
                    className="upload-progress-bar"
                    style={{
                      width:
                        `${Math.max(
                          0,
                          Math.min(
                            100,
                            Number(
                              analysisProgress.progress
                              ||
                              0
                            )
                          )
                        )}%`
                    }}
                  />

                </div>


                <div className="upload-progress-meta">

                  <span>

                    {analysisProgress.total > 0
                      ?
                      (
                        `${formatNumber(
                          analysisProgress.processed
                        )} dari ${formatNumber(
                          analysisProgress.total
                        )} opini telah diproses`
                      )
                      :
                      "Mempersiapkan data untuk proses klasifikasi"}

                  </span>


                  <span>
                    IndoBERT Seed 42 — Model Final
                  </span>

                </div>

              </div>

            )}


            {uploadError && (

              <div className="test-error upload-error">

                <strong>
                  Dataset tidak dapat diproses
                </strong>

                <span>
                  {uploadError}
                </span>

              </div>

            )}


            <div className="upload-actions">

              <button
                type="button"
                className={
                  selectedFile
                    ?
                    "button-file-secondary"
                    :
                    "button-select-file"
                }
                onClick={
                  handleChooseFile
                }
                disabled={
                  analysisLoading
                }
              >

                {selectedFile
                  ?
                  "Ganti Berkas"
                  :
                  "Pilih Berkas"}

              </button>


              {selectedFile && (

                <button
                  type="button"
                  className="button-select-file"
                  onClick={
                    handleAnalyzeCsv
                  }
                  disabled={
                    analysisLoading
                  }
                >

                  {analysisLoading
                    ?
                    `Menganalisis ${Math.round(
                      analysisProgress.progress
                      ||
                      0
                    )}%`
                    :
                    analysisResult
                      ?
                      "Analisis Ulang"
                      :
                      "Proses dengan IndoBERT"}

                </button>

              )}

            </div>


            <div className="upload-information">

              <span>
                Format CSV
              </span>

              <span className="separator">
                •
              </span>

              <span>
                Data tidak disimpan permanen
              </span>

              <span className="separator">
                •
              </span>

              <span>
                Stateless
              </span>

            </div>

          </div>

        </section>


        {/* =====================================================
            DASHBOARD
        ====================================================== */}

        {analysisResult && (

          <>

            {/* =================================================
                RINGKASAN
            ================================================== */}

            <section
              id="analysis-summary"
              className="dashboard-section"
            >

              <div className="dashboard-container">

                <div className="section-heading dashboard-heading">

                  <span className="section-label">
                    HASIL ANALISIS
                  </span>

                  <h2>
                    Ringkasan Dataset
                  </h2>

                  <p>

                    {analysisResult.filename}

                    {" • "}

                    {formatNumber(
                      analysisResult
                        .summary
                        .total_valid
                    )}

                    {" data berhasil diklasifikasikan."}

                  </p>

                </div>


                <div className="summary-grid">

                  <SummaryCard
                    icon="∑"
                    value={
                      formatNumber(
                        analysisResult
                          .summary
                          .total_valid
                      )
                    }
                    label="Total Data Dianalisis"
                  />


                  <SummaryCard
                    icon="K"
                    accent="green"
                    value={
                      `${formatNumber(
                        analysisResult
                          .summary
                          .konstruktif
                      )} • ${formatPercent(
                        analysisResult
                          .summary
                          .persen_konstruktif,
                        0
                      )}%`
                    }
                    label="Kritik Konstruktif"
                  />


                  <SummaryCard
                    icon="N"
                    accent="teal"
                    value={
                      `${formatNumber(
                        analysisResult
                          .summary
                          .nonkonstruktif
                      )} • ${formatPercent(
                        analysisResult
                          .summary
                          .persen_nonkonstruktif,
                        0
                      )}%`
                    }
                    label="Kritik Nonkonstruktif"
                  />


                  <SummaryCard
                    icon="B"
                    accent="purple"
                    value={
                      `${formatNumber(
                        analysisResult
                          .summary
                          .bukan_kritik
                      )} • ${formatPercent(
                        analysisResult
                          .summary
                          .persen_bukan_kritik,
                        0
                      )}%`
                    }
                    label="Tidak Layak/Bukan Kritik"
                  />


                  <SummaryCard
                    icon="%"
                    accent="purple"
                    value={
                      `${formatPercent(
                        analysisResult
                          .summary
                          .average_confidence
                      )}%`
                    }
                    label="Rata-rata Confidence"
                  />

                </div>


                <div className="summary-note">

                  <span>
                    Head-Tail 191+191
                  </span>

                  {" Sebanyak "}

                  <strong>
                    {formatNumber(
                      analysisResult
                        .summary
                        .head_tail_applied
                    )}
                  </strong>

                  {" data menggunakan strategi Head-Tail. "}

                  Confidence merupakan tingkat keyakinan
                  model, bukan akurasi dataset baru.

                </div>

              </div>

            </section>


            {/* =================================================
                EVALUASI MODEL
            ================================================== */}

            <section
              id="model-evaluation"
              className="dashboard-section dashboard-section-alt"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      EVALUASI MODEL
                    </span>

                    <h2>
                      Performa Model pada Data Uji
                    </h2>

                    <p>

                      Evaluasi final menggunakan testing set
                      yang dikunci selama proses pengembangan
                      model.

                    </p>

                  </div>


                  <div className="model-pill">
                    IndoBERT Seed 42 — Model Final
                  </div>

                </div>


                <div className="metrics-grid">

                  <MetricCard
                    label="Accuracy"
                    value={
                      MODEL_SUMMARY
                        .accuracy
                    }
                  />

                  <MetricCard
                    label="Precision Macro"
                    value={
                      MODEL_SUMMARY
                        .precision
                    }
                  />

                  <MetricCard
                    label="Recall Macro"
                    value={
                      MODEL_SUMMARY
                        .recall
                    }
                  />

                  <MetricCard
                    label="Macro-F1"
                    value={
                      MODEL_SUMMARY
                        .macroF1
                    }
                  />

                </div>


                <div className="evaluation-chart-grid">

                  <div
                    id="pdf-chart-model"
                    className="chart-card"
                  >

                    <div className="chart-card-header">

                      <div>

                        <span>
                          PERBANDINGAN MODEL
                        </span>

                        <h3>
                          IndoBERT vs SVM-TF-IDF
                        </h3>

                      </div>

                    </div>


                    <div className="chart-wrapper">

                      <ResponsiveContainer
                        width="100%"
                        height={310}
                      >

                        <BarChart
                          data={
                            MODEL_METRICS
                          }
                          margin={{
                            top: 20,
                            right: 20,
                            left: 10,
                            bottom: 0
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#eef0f4"
                          />

                          <XAxis
                            dataKey="metric"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={[
                              0,
                              100
                            ]}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            formatter={
                              (value) =>
                                `${formatPercent(
                                  value
                                )}%`
                            }
                          />

                          <Legend />

                          <Bar
                            dataKey="IndoBERT"
                            fill="#2563eb"
                            radius={[
                              6,
                              6,
                              0,
                              0
                            ]}
                          />

                          <Bar
                            dataKey="SVM"
                            name="SVM-TF-IDF"
                            fill="#94a3b8"
                            radius={[
                              6,
                              6,
                              0,
                              0
                            ]}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div
                    id="pdf-chart-confidence"
                    className="chart-card"
                  >

                    <div className="chart-card-header">

                      <div>

                        <span>
                          DATA BARU
                        </span>

                        <h3>
                          Distribusi Confidence
                        </h3>

                      </div>

                    </div>


                    <div className="chart-wrapper">

                      <ResponsiveContainer
                        width="100%"
                        height={310}
                      >

                        <BarChart
                          data={
                            confidenceData
                          }
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#eef0f4"
                          />

                          <XAxis
                            dataKey="range"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip />

                          <Bar
                            dataKey="count"
                            name="Jumlah Data"
                            fill="#2563eb"
                            radius={[
                              7,
                              7,
                              0,
                              0
                            ]}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                DISTRIBUSI
            ================================================== */}

            <section
              id="distribution"
              className="dashboard-section"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      DISTRIBUSI KRITIK
                    </span>

                    <h2>
                      Komposisi Hasil Klasifikasi
                    </h2>

                    <p>

                      Perbandingan jumlah hasil klasifikasi
                      Konstruktif, Nonkonstruktif, dan Tidak
                      Layak/Bukan Kritik pada dataset yang diunggah.

                    </p>

                  </div>

                </div>


                <div
                  id="pdf-chart-distribution"
                  className="two-chart-grid"
                >

                  <div className="chart-card">

                    <div className="chart-card-header">

                      <div>

                        <span>
                          PROPORSI DATA
                        </span>

                        <h3>
                          Distribusi Kritik
                        </h3>

                      </div>

                    </div>


                    <div className="chart-wrapper donut-wrapper">

                      <ResponsiveContainer
                        width="100%"
                        height={310}
                      >

                        <PieChart>

                          <Pie
                            data={
                              distributionData
                            }
                            dataKey="value"
                            nameKey="name"
                            innerRadius={78}
                            outerRadius={112}
                            paddingAngle={3}
                          >

                            {distributionData.map(
                              (
                                item,
                                index
                              ) => (

                                <Cell
                                  key={
                                    item.name
                                  }
                                  fill={
                                    DISTRIBUTION_COLORS[
                                      index
                                    ]
                                  }
                                />

                              )
                            )}

                          </Pie>

                          <Tooltip />

                          <Legend />

                        </PieChart>

                      </ResponsiveContainer>


                      <div className="donut-center">

                        <strong>
                          {formatNumber(
                            analysisResult
                              .summary
                              .total_valid
                          )}
                        </strong>

                        <span>
                          Total Data
                        </span>

                      </div>

                    </div>

                  </div>


                  <div className="chart-card">

                    <div className="chart-card-header">

                      <div>

                        <span>
                          JUMLAH DATA
                        </span>

                        <h3>
                          Perbandingan Kategori
                        </h3>

                      </div>

                    </div>


                    <div className="chart-wrapper">

                      <ResponsiveContainer
                        width="100%"
                        height={310}
                      >

                        <BarChart
                          data={
                            distributionData
                          }
                          layout="vertical"
                          margin={{
                            top: 20,
                            right: 35,
                            left: 35,
                            bottom: 10
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#eef0f4"
                          />

                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={135}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip />

                          <Bar
                            dataKey="value"
                            name="Jumlah Data"
                            radius={[
                              0,
                              7,
                              7,
                              0
                            ]}
                          >

                            {distributionData.map(
                              (
                                item,
                                index
                              ) => (

                                <Cell
                                  key={
                                    item.name
                                  }
                                  fill={
                                    DISTRIBUTION_COLORS[
                                      index
                                    ]
                                  }
                                />

                              )
                            )}

                          </Bar>

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                TREND WAKTU
            ================================================== */}

            <section
              id="time-trend"
              className="dashboard-section dashboard-section-alt"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      TREN WAKTU
                    </span>

                    <h2>
                      Perkembangan Kritik per Periode
                    </h2>

                    <p>

                      Jumlah hasil klasifikasi Konstruktif,
                      Nonkonstruktif, dan Tidak Layak/Bukan Kritik
                      berdasarkan tanggal publikasi data media sosial X.

                    </p>

                  </div>


                  <div className="trend-date-info">

                    <strong>

                      {formatNumber(
                        analysisResult
                          .analytics
                          .trend
                          .valid_dates
                      )}

                    </strong>

                    <span>
                      tanggal valid
                    </span>

                  </div>

                </div>


                {trendData.length
                  ?
                  (

                    <div
                      id="pdf-chart-trend"
                      className="chart-card"
                    >

                      <div className="chart-card-header">

                        <div>

                          <span>
                            TIME SERIES
                          </span>

                          <h3>
                            Tren Hasil Klasifikasi per Kategori
                          </h3>

                        </div>

                      </div>


                      <div className="chart-wrapper">

                        <ResponsiveContainer
                          width="100%"
                          height={360}
                        >

                          <LineChart
                            data={
                              trendData
                            }
                            margin={{
                              top: 20,
                              right: 30,
                              left: 10,
                              bottom: 10
                            }}
                          >

                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#eef0f4"
                            />

                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                            />

                            <YAxis
                              allowDecimals={false}
                              axisLine={false}
                              tickLine={false}
                            />

                            <Tooltip />

                            <Legend />

                            <Line
                              type="monotone"
                              dataKey="konstruktif"
                              name="Konstruktif"
                              stroke="#2563eb"
                              strokeWidth={3}
                            />

                            <Line
                              type="monotone"
                              dataKey="nonkonstruktif"
                              name="Nonkonstruktif"
                              stroke="#0f766e"
                              strokeWidth={3}
                            />

                            <Line
                              type="monotone"
                              dataKey="bukan_kritik"
                              name="Tidak Layak/Bukan Kritik"
                              stroke="#7c3aed"
                              strokeWidth={3}
                            />

                          </LineChart>

                        </ResponsiveContainer>

                      </div>

                    </div>

                  )
                  :
                  (

                    <div className="empty-state">

                      Tidak terdapat tanggal
                      yang dapat digunakan.

                    </div>

                  )}

              </div>

            </section>


            {/* =================================================
                KATA & TOPIK
            ================================================== */}

            <section
              id="words-topics"
              className="dashboard-section"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      KATA & TOPIK
                    </span>

                    <h2>
                      Kata Dominan dalam Kritik
                    </h2>

                    <p>

                      Frekuensi kata dihitung dari Clean text
                      untuk membantu melihat pola kata yang
                      sering muncul pada dataset.

                    </p>

                  </div>


                  <div className="word-filter">

                    {[
                      [
                        "all",
                        "Semua"
                      ],
                      [
                        "konstruktif",
                        "Konstruktif"
                      ],
                      [
                        "nonkonstruktif",
                        "Nonkonstruktif"
                      ],
                      [
                        "bukan_kritik",
                        "Bukan Kritik"
                      ]
                    ].map(
                      (
                        [
                          value,
                          label
                        ]
                      ) => (

                        <button
                          key={
                            value
                          }
                          className={
                            wordFilter ===
                            value
                              ?
                              "active"
                              :
                              ""
                          }
                          onClick={
                            () =>
                              setWordFilter(
                                value
                              )
                          }
                        >
                          {label}
                        </button>

                      )
                    )}

                  </div>

                </div>


                <div className="words-grid">

                  <div
                    id="pdf-chart-words"
                    className="chart-card"
                  >

                    <div className="chart-card-header">

                      <div>

                        <span>
                          TOP 10
                        </span>

                        <h3>
                          Kata Paling Sering Muncul
                        </h3>

                      </div>

                    </div>


                    <div className="chart-wrapper">

                      <ResponsiveContainer
                        width="100%"
                        height={370}
                      >

                        <BarChart
                          data={
                            currentTopWords
                              .slice(
                                0,
                                10
                              )
                          }
                          layout="vertical"
                          margin={{
                            top: 5,
                            right: 35,
                            left: 30,
                            bottom: 5
                          }}
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#eef0f4"
                          />

                          <XAxis
                            type="number"
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            type="category"
                            dataKey="word"
                            width={120}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip />

                          <Bar
                            dataKey="count"
                            name="Frekuensi"
                            fill="#2563eb"
                            radius={[
                              0,
                              7,
                              7,
                              0
                            ]}
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>


                  <div className="chart-card">

                    <div className="chart-card-header">

                      <div>

                        <span>
                          WORDCLOUD
                        </span>

                        <h3>
                          Visualisasi Kata Populer
                        </h3>

                      </div>

                    </div>


                    <WordCloud
                      words={
                        currentTopWords
                      }
                    />

                  </div>

                </div>


                <div className="analytics-method-note">

                  Ukuran kata pada wordcloud menunjukkan
                  frekuensi kemunculan, bukan tingkat
                  kepentingan kebijakan.

                </div>

              </div>

            </section>


            {/* =================================================
                INSIGHT KONSTRUKTIF
            ================================================== */}

            <section
              id="constructive-insight"
              className="dashboard-section dashboard-section-alt"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      INSIGHT KONSTRUKTIF
                    </span>

                    <h2>
                      Masukan Publik yang Menonjol
                    </h2>

                    <p>

                      Kritik konstruktif dikelompokkan
                      berdasarkan pola tematik untuk membantu
                      memahami aspek Program MBG yang paling
                      sering menjadi arah masukan publik.

                    </p>

                  </div>


                  <div className="model-pill">

                    {formatNumber(
                      analysisResult
                        .summary
                        .konstruktif
                    )}

                    {" kritik konstruktif"}

                  </div>

                </div>


                {constructiveInsight && (

                  <div className="public-insight-card">

                    <div className="public-insight-content">

                      <span className="public-insight-label">
                        RINGKASAN INSIGHT PUBLIK
                      </span>


                      <h3>
                        {constructiveInsight.headline}
                      </h3>


                      <p>
                        {constructiveInsight.summary_text}
                      </p>


                      <div className="public-insight-warning">

                        Ringkasan dibentuk dari pola kritik
                        konstruktif pada dataset yang diunggah
                        dan digunakan sebagai bahan interpretasi,
                        bukan keputusan otomatis.

                      </div>

                    </div>


                    <div className="insight-stat-grid">

                      <div className="insight-stat-card">

                        <span>
                          Kritik Konstruktif
                        </span>

                        <strong>

                          {formatNumber(
                            constructiveInsight
                              .total_constructive
                          )}

                        </strong>

                        <small>
                          total hasil IndoBERT
                        </small>

                      </div>


                      <div className="insight-stat-card">

                        <span>
                          Terpetakan
                        </span>

                        <strong>

                          {formatNumber(
                            constructiveInsight
                              .classified_count
                          )}

                        </strong>

                        <small>
                          memiliki tema cukup kuat
                        </small>

                      </div>


                      <div className="insight-stat-card">

                        <span>
                          Masukan Lainnya
                        </span>

                        <strong>

                          {formatNumber(
                            constructiveInsight
                              .unclassified_count
                          )}

                        </strong>

                        <small>
                          belum dipaksakan ke tema
                        </small>

                      </div>


                      <div className="insight-stat-card coverage">

                        <span>
                          Cakupan Pemetaan Tema
                        </span>

                        <strong>

                          {formatPercent(
                            constructiveInsight
                              .coverage_percent
                          )}

                          %

                        </strong>

                        <small>
                          bukan nilai akurasi
                        </small>

                      </div>

                    </div>

                  </div>

                )}


                <div className="priority-heading">

                  <div>

                    <span className="section-label">
                      MASUKAN UTAMA
                    </span>

                    <h3>
                      Aspek yang Paling Sering Disoroti
                    </h3>

                    <p>

                      Urutan ditentukan berdasarkan jumlah
                      kritik konstruktif yang berhasil
                      dipetakan pada setiap tema.

                    </p>

                  </div>

                </div>


                {constructiveInsight
                  ?.key_points
                  ?.length
                  ?
                  (

                    <div className="priority-grid">

                      {constructiveInsight
                        .key_points
                        .slice(
                          0,
                          4
                        )
                        .map(
                          (
                            item,
                            index
                          ) => {

                            const themeData =
                              constructiveThemes
                                .find(
                                  (theme) =>
                                    theme.label ===
                                    item.title
                                )


                            return (

                              <article
                                key={
                                  `${item.title}-${index}`
                                }
                                className="priority-card"
                              >

                                <div className="priority-card-header">

                                  <div className="priority-rank">

                                    {String(
                                      item.rank
                                    ).padStart(
                                      2,
                                      "0"
                                    )}

                                  </div>


                                  <div className="priority-frequency">

                                    <strong>

                                      {formatNumber(
                                        item.count
                                      )}

                                      {" komentar"}

                                    </strong>

                                    <span>

                                      {formatPercent(
                                        item.percentage
                                      )}

                                      % dari kritik konstruktif

                                    </span>

                                  </div>

                                </div>


                                <h4>
                                  {item.title}
                                </h4>


                                <p className="priority-description">
                                  {item.description}
                                </p>


                                <div className="priority-direction">

                                  <span>
                                    Arah Evaluasi
                                  </span>

                                  <p>
                                    {item.direction}
                                  </p>

                                </div>


                                {themeData
                                  ?.top_terms
                                  ?.length >
                                  0
                                  &&
                                  (

                                    <div className="priority-terms">

                                      <span className="priority-terms-title">
                                        Indikator yang ditemukan
                                      </span>


                                      <div className="term-chip-list">

                                        {themeData
                                          .top_terms
                                          .slice(
                                            0,
                                            5
                                          )
                                          .map(
                                            (
                                              term,
                                              termIndex
                                            ) => (

                                              <span
                                                key={
                                                  `${term.term}-${termIndex}`
                                                }
                                                className="term-chip"
                                              >

                                                {term.term}

                                                <small>
                                                  {term.count}
                                                </small>

                                              </span>

                                            )
                                          )}

                                      </div>

                                    </div>

                                  )}


                                {item
                                  ?.examples
                                  ?.[0]
                                  ?.text
                                  &&
                                  (

                                    <div className="priority-evidence">

                                      <span>
                                        Contoh komentar terkait
                                      </span>

                                      <p>

                                        “{
                                          item
                                            .examples[0]
                                            .text
                                        }”

                                      </p>

                                    </div>

                                  )}

                              </article>

                            )

                          }
                        )}

                    </div>

                  )
                  :
                  (

                    <div className="empty-state">

                      Belum terdapat tema yang memiliki
                      indikator cukup kuat untuk ditampilkan
                      sebagai masukan utama.

                    </div>

                  )}


                {constructiveInsight
                  ?.unclassified_count >
                  0
                  &&
                  (

                    <div className="unmapped-insight-note">

                      <div className="unmapped-icon">
                        i
                      </div>


                      <div>

                        <strong>

                          {formatNumber(
                            constructiveInsight
                              .unclassified_count
                          )}

                          {" komentar masuk kategori Masukan Lainnya"}

                        </strong>


                        <p>

                          Komentar tersebut tidak memiliki
                          bukti tematik yang cukup kuat untuk
                          dimasukkan ke salah satu kelompok
                          utama. Data tetap tersedia pada
                          bagian Data Hasil untuk ditinjau
                          secara individual.

                        </p>

                      </div>

                    </div>

                  )}


                <div className="insight-subheading">

                  <span className="section-label">
                    PENDALAMAN POLA
                  </span>

                  <h3>
                    Frasa dan Konteks Kritik
                  </h3>

                </div>


                <div className="constructive-layout">

                  <div className="insight-panel">

                    <div className="insight-panel-header">

                      <span>
                        FRASA DOMINAN
                      </span>

                      <h3>
                        Frasa yang Sering Muncul Bersama
                      </h3>

                    </div>


                    <div className="phrase-grid">

                      {constructivePhrases
                        .slice(
                          0,
                          10
                        )
                        .map(
                          (
                            item,
                            index
                          ) => (

                            <div
                              key={
                                `${item.phrase}-${index}`
                              }
                              className="phrase-card"
                            >

                              <span className="phrase-rank">

                                {String(
                                  index + 1
                                ).padStart(
                                  2,
                                  "0"
                                )}

                              </span>


                              <div>

                                <strong>
                                  {item.phrase}
                                </strong>

                                <span>

                                  {formatNumber(
                                    item.count
                                  )}

                                  {" kemunculan"}

                                </span>

                              </div>

                            </div>

                          )
                        )}

                    </div>

                  </div>


                  <div className="decision-panel">

                    <span className="decision-label">
                      INTERPRETASI
                    </span>

                    <h3>
                      Cara Membaca Insight
                    </h3>

                    <p>

                      Tema menunjukkan pola komentar yang
                      memiliki indikator cukup kuat.
                      Frekuensi digunakan untuk membantu
                      melihat aspek yang lebih sering
                      disoroti pada dataset.

                    </p>


                    <div className="decision-steps">

                      <div>

                        <span>
                          01
                        </span>

                        Lihat ringkasan keseluruhan
                        kritik konstruktif.

                      </div>


                      <div>

                        <span>
                          02
                        </span>

                        Tinjau tema, indikator,
                        dan contoh komentar pendukung.

                      </div>


                      <div>

                        <span>
                          03
                        </span>

                        Gunakan hasil sebagai bahan
                        evaluasi, bukan keputusan otomatis.

                      </div>

                    </div>

                  </div>

                </div>


                <div className="examples-heading">

                  <span className="section-label">
                    CONTOH DATA
                  </span>

                  <h3>
                    Kritik Konstruktif dengan Confidence Tinggi
                  </h3>

                </div>


                <div className="constructive-example-grid">

                  {constructiveExamples
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (
                        item,
                        index
                      ) => (

                        <article
                          key={
                            `${item.tweet_id}-${index}`
                          }
                          className="constructive-example-card"
                        >

                          <div className="example-card-top">

                            <span>
                              Kritik Konstruktif
                            </span>

                            <strong>

                              {formatPercent(
                                item.confidence
                              )}

                              %

                            </strong>

                          </div>


                          <p>
                            {item.text}
                          </p>


                          <div className="example-meta">

                            <span>
                              {item.tanggal}
                            </span>

                          </div>

                        </article>

                      )
                    )}

                </div>


                <div className="analytics-method-note">

                  Insight tematik merupakan hasil pengelompokan
                  rule-based terhadap data yang telah diprediksi
                  sebagai kritik konstruktif oleh IndoBERT.
                  Cakupan tema bukan nilai akurasi klasifikasi
                  tematik karena tidak digunakan ground truth
                  tema pada proses ini.

                </div>

              </div>

            </section>


            {/* =================================================
                DATA HASIL
            ================================================== */}

            <section
              id="data-preview"
              className="dashboard-section"
            >

              <div className="dashboard-container">

                <div className="dashboard-title-row">

                  <div>

                    <span className="section-label">
                      DATA HASIL
                    </span>

                    <h2>
                      Hasil Klasifikasi Dataset
                    </h2>

                    <p>

                      Telusuri hasil prediksi IndoBERT
                      berdasarkan Tweet ID, isi teks,
                      kategori kritik, dan tingkat
                      confidence model.

                    </p>

                  </div>


                  <div className="data-header-actions">

                    <div className="data-count-pill">

                      {formatNumber(
                        analysisResult
                          .summary
                          .total_valid
                      )}

                      {" data"}

                    </div>


                    <button
                      type="button"
                      className="button-file-secondary"
                      onClick={
                        handleDownloadFullCsv
                      }
                    >
                      Unduh CSV Lengkap
                    </button>


                    {hasActiveDataFilter && (

                      <button
                        type="button"
                        className="button-select-file"
                        onClick={
                          handleDownloadFilteredCsv
                        }
                        disabled={
                          filteredData.length ===
                          0
                        }
                      >

                        Unduh Hasil Filter
                        {" ("}

                        {formatNumber(
                          filteredData.length
                        )}

                        {")"}

                      </button>

                    )}

                  </div>

                </div>


                {/* =============================================
                    SEARCH + FILTER
                ============================================== */}

                <div className="data-control-panel">

                  <div className="data-search-area">

                    <label
                      htmlFor="data-search"
                      className="data-control-label"
                    >
                      Cari Data
                    </label>


                    <div className="data-search-input-wrapper">

                      <span className="data-search-icon">
                        ⌕
                      </span>


                      <input
                        id="data-search"
                        type="text"
                        value={
                          dataSearch
                        }
                        onChange={
                          (event) =>
                            setDataSearch(
                              event.target.value
                            )
                        }
                        placeholder="Cari Tweet ID, tanggal, atau isi teks..."
                      />


                      {dataSearch && (

                        <button
                          type="button"
                          className="clear-search-button"
                          onClick={
                            () =>
                              setDataSearch("")
                          }
                          title="Hapus pencarian"
                        >
                          ×
                        </button>

                      )}

                    </div>

                  </div>


                  <div className="data-filter-grid">

                    <div className="data-filter-field">

                      <label
                        htmlFor="prediction-filter"
                        className="data-control-label"
                      >
                        Kategori Kritik
                      </label>


                      <select
                        id="prediction-filter"
                        value={
                          predictionFilter
                        }
                        onChange={
                          (event) =>
                            setPredictionFilter(
                              event.target.value
                            )
                        }
                      >

                        <option value="all">
                          Semua Kategori
                        </option>

                        <option value="constructive">
                          Kritik Konstruktif
                        </option>

                        <option value="nonconstructive">
                          Kritik Nonkonstruktif
                        </option>

                        <option value="not-criticism">
                          Tidak Layak/Bukan Kritik
                        </option>

                      </select>

                    </div>


                    <div className="data-filter-field">

                      <label
                        htmlFor="confidence-filter"
                        className="data-control-label"
                      >
                        Confidence
                      </label>


                      <select
                        id="confidence-filter"
                        value={
                          confidenceFilter
                        }
                        onChange={
                          (event) =>
                            setConfidenceFilter(
                              event.target.value
                            )
                        }
                      >

                        <option value="all">
                          Semua Confidence
                        </option>

                        <option value="high">
                          Tinggi ≥ 90%
                        </option>

                        <option value="medium">
                          Sedang 70–89,99%
                        </option>

                        <option value="low">
                          Rendah &lt; 70%
                        </option>

                      </select>

                    </div>


                    <div className="data-filter-field">

                      <label
                        htmlFor="rows-per-page"
                        className="data-control-label"
                      >
                        Per Halaman
                      </label>


                      <select
                        id="rows-per-page"
                        value={
                          rowsPerPage
                        }
                        onChange={
                          (event) =>
                            setRowsPerPage(
                              Number(
                                event.target.value
                              )
                            )
                        }
                      >

                        <option value={10}>
                          10 data
                        </option>

                        <option value={25}>
                          25 data
                        </option>

                        <option value={50}>
                          50 data
                        </option>

                      </select>

                    </div>


                    <div className="data-filter-action">

                      <span className="data-control-label">
                        Filter
                      </span>


                      <button
                        type="button"
                        className="reset-filter-button"
                        onClick={
                          handleResetDataFilters
                        }
                        disabled={
                          !hasActiveDataFilter
                        }
                      >
                        Reset Filter
                      </button>

                    </div>

                  </div>


                  <div className="data-filter-summary">

                    <div>

                      <span className="filter-result-count">

                        {formatNumber(
                          filteredData.length
                        )}

                      </span>

                      <span>
                        {" data sesuai pencarian/filter"}
                      </span>

                    </div>


                    {hasActiveDataFilter && (

                      <div className="filter-active-badge">
                        Filter Aktif
                      </div>

                    )}

                  </div>

                </div>


                {/* =============================================
                    TABLE
                ============================================== */}

                <div className="data-table-card">

                  {filteredData.length >
                  0
                    ?
                    (

                      <>

                        <div className="table-scroll">

                          <table className="result-table">

                            <thead>

                              <tr>

                                <th>
                                  Tweet ID
                                </th>

                                <th>
                                  Tanggal
                                </th>

                                <th>
                                  Teks
                                </th>

                                <th>
                                  Prediksi
                                </th>

                                <th>
                                  Confidence
                                </th>

                              </tr>

                            </thead>


                            <tbody>

                              {paginatedData.map(
                                (
                                  item,
                                  index
                                ) => (

                                  <tr
                                    key={
                                      `${item["Tweet ID"]}-${index}`
                                    }
                                  >

                                    <td className="tweet-id-cell">

                                      {String(
                                        item[
                                          "Tweet ID"
                                        ]
                                      )}

                                    </td>


                                    <td className="date-cell">

                                      {item[
                                        "Tanggal"
                                      ]}

                                    </td>


                                    <td className="text-cell">

                                      {item[
                                        "Full text"
                                      ]}

                                    </td>


                                    <td>

                                      <span
                                        className={
                                          Number(
                                            item[
                                              "Prediction ID"
                                            ]
                                          ) ===
                                          1
                                            ?
                                            "prediction-badge constructive-badge"
                                            :
                                            Number(
                                              item[
                                                "Prediction ID"
                                              ]
                                            ) ===
                                            2
                                              ?
                                              "prediction-badge not-criticism-badge"
                                              :
                                              "prediction-badge nonconstructive-badge"
                                        }
                                      >

                                        {Number(
                                          item[
                                            "Prediction ID"
                                          ]
                                        ) ===
                                        1
                                          ?
                                          "Konstruktif"
                                          :
                                          Number(
                                            item[
                                              "Prediction ID"
                                            ]
                                          ) ===
                                          2
                                            ?
                                            "Tidak Layak/Bukan Kritik"
                                            :
                                            "Nonkonstruktif"}

                                      </span>

                                    </td>


                                    <td>

                                      <div className="confidence-table-cell">

                                        <strong>

                                          {formatPercent(
                                            item[
                                              "Confidence"
                                            ]
                                          )}

                                          %

                                        </strong>


                                        <div className="confidence-mini-bar">

                                          <div
                                            style={{
                                              width:
                                                `${Math.min(
                                                  Number(
                                                    item[
                                                      "Confidence"
                                                    ]
                                                    ||
                                                    0
                                                  ),
                                                  100
                                                )}%`
                                            }}
                                          />

                                        </div>

                                      </div>

                                    </td>

                                  </tr>

                                )
                              )}

                            </tbody>

                          </table>

                        </div>


                        <div className="table-pagination">

                          <div className="pagination-information">

                            Menampilkan{" "}

                            <strong>
                              {formatNumber(
                                firstVisibleItem
                              )}
                            </strong>

                            {"–"}

                            <strong>
                              {formatNumber(
                                lastVisibleItem
                              )}
                            </strong>

                            {" dari "}

                            <strong>
                              {formatNumber(
                                filteredData.length
                              )}
                            </strong>

                            {" data"}

                          </div>


                          <div className="pagination-controls">

                            <button
                              type="button"
                              className="pagination-navigation"
                              onClick={
                                () =>
                                  setCurrentPage(
                                    (page) =>
                                      Math.max(
                                        1,
                                        page -
                                        1
                                      )
                                  )
                              }
                              disabled={
                                currentPage ===
                                1
                              }
                            >
                              ‹
                            </button>


                            {paginationPages.map(
                              (page) => (

                                <button
                                  type="button"
                                  key={
                                    page
                                  }
                                  className={
                                    currentPage ===
                                    page
                                      ?
                                      "pagination-page active"
                                      :
                                      "pagination-page"
                                  }
                                  onClick={
                                    () =>
                                      setCurrentPage(
                                        page
                                      )
                                  }
                                >
                                  {page}
                                </button>

                              )
                            )}


                            <button
                              type="button"
                              className="pagination-navigation"
                              onClick={
                                () =>
                                  setCurrentPage(
                                    (page) =>
                                      Math.min(
                                        totalPages,
                                        page +
                                        1
                                      )
                                  )
                              }
                              disabled={
                                currentPage ===
                                totalPages
                              }
                            >
                              ›
                            </button>

                          </div>


                          <div className="pagination-page-info">

                            Halaman{" "}

                            <strong>
                              {currentPage}
                            </strong>

                            {" dari "}

                            <strong>
                              {totalPages}
                            </strong>

                          </div>

                        </div>

                      </>

                    )
                    :
                    (

                      <div className="table-empty-state">

                        <div className="table-empty-icon">
                          ⌕
                        </div>


                        <h3>
                          Data tidak ditemukan
                        </h3>


                        <p>

                          Tidak terdapat data yang sesuai
                          dengan kata pencarian atau filter
                          yang sedang digunakan.

                        </p>


                        <button
                          type="button"
                          onClick={
                            handleResetDataFilters
                          }
                        >
                          Reset Pencarian & Filter
                        </button>

                      </div>

                    )}

                </div>


                <div className="data-table-note">

                  Pencarian dan filter hanya memengaruhi
                  tampilan tabel. Tombol
                  <strong> Unduh CSV Lengkap </strong>
                  mengekspor seluruh hasil klasifikasi,
                  sedangkan
                  <strong> Unduh Hasil Filter </strong>
                  mengekspor seluruh data yang sesuai filter,
                  bukan hanya data pada halaman aktif.

                </div>

              </div>

            </section>

          </>

        )}


        {/* =====================================================
            ABOUT
        ====================================================== */}

        <section
          id="tentang"
          className="about-section"
        >

          <div className="about-container">

            <div className="about-content">

              <span className="section-label">
                TENTANG SISTEM
              </span>

              <h2>
                Klasifikasi Kritik dengan IndoBERT
              </h2>

              <p>

                MBG Insight menggunakan model IndoBERT
                hasil fine-tuning untuk mengklasifikasikan
                teks ke dalam tiga kelas, yaitu Kritik Konstruktif,
                Kritik Nonkonstruktif, dan Tidak Layak/Bukan Kritik.

              </p>

            </div>


            <div className="model-info-card">

              <div className="model-status">

                <span className="status-dot" />

                Model Aktif

              </div>


              <strong>
                IndoBERT Seed 42 — Model Final
              </strong>

              <span>
                3-Class Text Classification
              </span>

            </div>

          </div>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="footer">

        <div className="footer-container">

          <div>

            <strong>
              MBG Insight
            </strong>

            <p>
              Dashboard Analitik Kritik Publik Berbasis IndoBERT
            </p>

          </div>

          <span>
            Penelitian Skripsi • 2026
          </span>

        </div>

      </footer>


      {/* =====================================================
          MODAL UJI TEKS
      ====================================================== */}

      {isTestModalOpen && (

        <div
          className="test-modal-overlay"
          onMouseDown={
            closeTestModal
          }
        >

          <div
            className="test-modal"
            onMouseDown={
              (event) =>
                event.stopPropagation()
            }
          >

            <div className="test-modal-header">

              <div>

                <span className="test-modal-label">
                  INDOBERT PREDICTION
                </span>

                <h2>
                  Uji Teks Tunggal
                </h2>

                <p>

                  Masukkan satu opini mengenai Program
                  Makan Bergizi Gratis untuk melihat
                  hasil klasifikasi model.

                </p>

              </div>


              <button
                type="button"
                className="test-modal-close"
                onClick={
                  closeTestModal
                }
                disabled={
                  testLoading
                }
              >
                ×
              </button>

            </div>


            <div className="test-scope-notice">

              <div className="scope-notice-icon">
                i
              </div>


              <div className="scope-notice-content">

                <strong>
                  Ruang Lingkup Pengujian
                </strong>

                <p>

                  Masukkan teks yang berkaitan dengan Program MBG.
                  Model membedakan <b> Kritik Konstruktif </b>,
                  <b> Kritik Nonkonstruktif </b>, dan
                  <b> Tidak Layak/Bukan Kritik</b>.

                </p>

              </div>

            </div>


            <div className="test-input-group">

              <label htmlFor="test-text">
                Teks Opini
              </label>

              <textarea
                id="test-text"
                value={
                  testText
                }
                onChange={
                  (event) => {

                    setTestText(
                      event.target.value
                    )

                    setTestError("")
                  }
                }
                onKeyDown={
                  handleTextareaKeyDown
                }
                placeholder="Contoh: pelaksanaan MBG perlu diperbaiki dengan memperketat pengawasan kualitas makanan..."
                maxLength={5000}
                disabled={
                  testLoading
                }
              />


              <div className="test-input-footer">

                <span>
                  Ctrl + Enter untuk analisis
                </span>

                <span>

                  {formatNumber(
                    testText.length
                  )}

                  {" / 5.000 karakter"}

                </span>

              </div>

            </div>


            {testError && (

              <div className="test-error">

                <strong>
                  Teks belum dapat dianalisis
                </strong>

                <span>
                  {testError}
                </span>

              </div>

            )}


            {testResult && (

              <div
                className={
                  testResult
                    .prediction_id ===
                  1
                    ?
                    "test-result constructive"
                    :
                    testResult.prediction_id === 2
                      ?
                      "test-result not-criticism"
                      :
                      "test-result nonconstructive"
                }
              >

                <div className="test-result-top">

                  <div>

                    <span className="test-result-caption">
                      HASIL KLASIFIKASI
                    </span>

                    <h3>
                      {testResult.label}
                    </h3>

                  </div>


                  <div className="test-confidence">

                    <span>
                      Confidence
                    </span>

                    <strong>

                      {formatPercent(
                        testResult
                          .confidence_percent
                      )}

                      %

                    </strong>

                  </div>

                </div>


                <div className="test-probability-grid">

                  <div className="probability-item">

                    <span>
                      Nonkonstruktif
                    </span>

                    <strong>

                      {formatPercent(
                        testResult
                          .probabilities
                          .nonkonstruktif
                        *
                        100
                      )}

                      %

                    </strong>

                  </div>


                  <div className="probability-item">

                    <span>
                      Konstruktif
                    </span>

                    <strong>

                      {formatPercent(
                        testResult
                          .probabilities
                          .konstruktif
                        *
                        100
                      )}

                      %

                    </strong>

                  </div>


                  <div className="probability-item">

                    <span>
                      Bukan Kritik
                    </span>

                    <strong>

                      {formatPercent(
                        testResult
                          .probabilities
                          .bukan_kritik
                        *
                        100
                      )}

                      %

                    </strong>

                  </div>


                  <div className="probability-item">

                    <span>
                      Panjang Token
                    </span>

                    <strong>
                      {testResult.token_length}
                    </strong>

                  </div>


                  <div className="probability-item">

                    <span>
                      Head-Tail
                    </span>

                    <strong>

                      {testResult
                        .head_tail_applied
                        ?
                        "Digunakan"
                        :
                        "Tidak"}

                    </strong>

                  </div>

                </div>

              </div>

            )}


            <div className="test-modal-actions">

              <button
                type="button"
                className="test-button-cancel"
                onClick={
                  closeTestModal
                }
                disabled={
                  testLoading
                }
              >
                Tutup
              </button>


              <button
                type="button"
                className="test-button-predict"
                onClick={
                  handleTestPrediction
                }
                disabled={
                  testLoading
                }
              >

                {testLoading
                  ?
                  "Menganalisis..."
                  :
                  "Analisis dengan IndoBERT"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          PDF GENERATING OVERLAY
      ====================================================== */}

      {reportGenerating && (

        <div className="report-loading-overlay">

          <div className="report-loading-card">

            <div className="report-spinner" />

            <strong>
              Menyusun Laporan PDF
            </strong>

            <p>
              Menangkap grafik dan menyusun hasil analisis.
              Proses ini dapat memerlukan beberapa detik.
            </p>

            <span>
              Jangan tutup halaman sampai proses selesai.
            </span>

          </div>

        </div>

      )}


      {/* =====================================================
          PDF ERROR
      ====================================================== */}

      {reportError && (

        <div className="report-error-toast">

          <div>

            <strong>
              Laporan PDF gagal dibuat
            </strong>

            <span>
              {reportError}
            </span>

          </div>


          <button
            type="button"
            onClick={
              () =>
                setReportError("")
            }
          >
            ×
          </button>

        </div>

      )}

    </div>
  )
}


export default App