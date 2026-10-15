import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import logoSrc from "./assets/logo.png"


// ============================================================
// KONFIGURASI LAPORAN
// ============================================================

const REPORT_TITLE =
  "Laporan Analisis Kritik Publik terhadap Program MBG"

const REPORT_APP_NAME =
  "MBG Insight"

const REPORT_MODEL =
  "IndoBERT Seed 42 — Model Final"

const REPORT_YEAR =
  "2026"

const MARGIN =
  16

const PAGE_BOTTOM =
  277


// ============================================================
// HELPER UMUM
// ============================================================

const wait = (
  milliseconds
) =>
  new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  )


const formatNumber = (
  value
) =>
  Number(
    value || 0
  ).toLocaleString(
    "id-ID"
  )


const formatPercent = (
  value,
  decimals = 2
) =>
  Number(
    value || 0
  ).toLocaleString(
    "id-ID",
    {
      minimumFractionDigits:
        decimals,

      maximumFractionDigits:
        decimals
    }
  )


const formatDate = () =>
  new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(
    new Date()
  )


const sanitizeFileName = (
  value
) => {

  const name =
    String(
      value ||
      "dataset"
    )
      .replace(
        /\.csv$/i,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(
        0,
        55
      )


  return (
    name ||
    "dataset"
  )
}


const timestamp = () => {

  const date =
    new Date()


  const pad = (
    value
  ) =>
    String(
      value
    ).padStart(
      2,
      "0"
    )


  return (
    `${date.getFullYear()}-` +
    `${pad(
      date.getMonth() + 1
    )}-` +
    `${pad(
      date.getDate()
    )}_` +
    `${pad(
      date.getHours()
    )}-` +
    `${pad(
      date.getMinutes()
    )}`
  )
}


// ============================================================
// CAPTURE ELEMEN DASHBOARD
// ============================================================

const captureElement =
  async (
    elementId
  ) => {

    const element =
      document.getElementById(
        elementId
      )


    if (!element) {

      console.warn(
        `Elemen laporan tidak ditemukan: ${elementId}`
      )

      return null
    }


    try {

      const canvas =
        await html2canvas(
          element,
          {
            backgroundColor:
              "#ffffff",

            scale:
              1.8,

            useCORS:
              true,

            logging:
              false,

            removeContainer:
              true,

            imageTimeout:
              15000
          }
        )


      return {

        dataUrl:
          canvas.toDataURL(
            "image/png",
            1.0
          ),

        width:
          canvas.width,

        height:
          canvas.height
      }

    }

    catch (
      error
    ) {

      console.warn(
        `Gagal menangkap ${elementId}:`,
        error
      )

      return null
    }
  }


// ============================================================
// LOAD LOGO DARI frontend/src/assets/logo.png
// ============================================================

const captureLogo =
  async () => {

    try {

      const image =
        new Image()


      image.src =
        logoSrc


      image.decoding =
        "async"


      await new Promise(
        (
          resolve,
          reject
        ) => {

          image.onload =
            resolve

          image.onerror =
            reject
        }
      )


      return {

        dataUrl:
          logoSrc,

        width:
          image.naturalWidth ||
          image.width,

        height:
          image.naturalHeight ||
          image.height
      }

    }

    catch (
      error
    ) {

      console.warn(
        "Logo tidak dapat dimuat:",
        error
      )

      return null
    }
  }


// ============================================================
// WATERMARK LOGO
// ============================================================

const addWatermark =
  (
    pdf,
    logo
  ) => {

    if (!logo) {

      return
    }


    try {

      const pageWidth =
        pdf.internal
          .pageSize
          .getWidth()


      const pageHeight =
        pdf.internal
          .pageSize
          .getHeight()


      const maxSize =
        Math.min(
          pageWidth,
          pageHeight
        ) *
        0.40


      const ratio =
        Math.min(
          maxSize /
            logo.width,

          maxSize /
            logo.height
        )


      const width =
        logo.width *
        ratio


      const height =
        logo.height *
        ratio


      const x =
        (
          pageWidth -
          width
        ) /
        2


      const y =
        (
          pageHeight -
          height
        ) /
        2


      let opacityApplied =
        false


      if (
        pdf.GState &&
        typeof pdf.setGState ===
          "function"
      ) {

        try {

          pdf.setGState(
            new pdf.GState(
              {
                opacity:
                  0.07
              }
            )
          )


          opacityApplied =
            true

        }

        catch (
          error
        ) {

          console.warn(
            "Opacity watermark tidak tersedia:",
            error
          )
        }
      }


      pdf.addImage(
        logo.dataUrl,
        "PNG",
        x,
        y,
        width,
        height,
        "MBG_WATERMARK",
        "FAST"
      )


      if (
        opacityApplied
      ) {

        try {

          pdf.setGState(
            new pdf.GState(
              {
                opacity:
                  1
              }
            )
          )

        }

        catch (
          error
        ) {

          console.warn(
            "Gagal reset opacity:",
            error
          )
        }
      }

    }

    catch (
      error
    ) {

      console.warn(
        "Watermark dilewati:",
        error
      )
    }
  }


// ============================================================
// GENERATE PDF
// ============================================================

export const generateMBGReport =
  async (
    {
      analysisResult,
      constructiveInsight
    }
  ) => {

    if (
      !analysisResult
    ) {

      throw new Error(
        "Belum ada hasil analisis untuk dibuat menjadi laporan."
      )
    }


    await wait(
      350
    )


    // ========================================================
    // CAPTURE LOGO DAN GRAFIK
    // ========================================================

    const [
      reportLogo,
      modelChart,
      confidenceChart,
      distributionChart,
      trendChart,
      wordsChart
    ] =
      await Promise.all(
        [

          captureLogo(),

          captureElement(
            "pdf-chart-model"
          ),

          captureElement(
            "pdf-chart-confidence"
          ),

          captureElement(
            "pdf-chart-distribution"
          ),

          captureElement(
            "pdf-chart-trend"
          ),

          captureElement(
            "pdf-chart-words"
          )

        ]
      )


    // ========================================================
    // INIT PDF
    // ========================================================

    const pdf =
      new jsPDF(
        {
          orientation:
            "portrait",

          unit:
            "mm",

          format:
            "a4",

          compress:
            true
        }
      )


    const PAGE_WIDTH =
      pdf.internal
        .pageSize
        .getWidth()


    const PAGE_HEIGHT =
      pdf.internal
        .pageSize
        .getHeight()


    const CONTENT_WIDTH =
      PAGE_WIDTH -
      (
        MARGIN *
        2
      )


    let cursorY =
      20


    const summary =
      analysisResult.summary ||
      {}


    // ========================================================
    // HELPER PDF
    // ========================================================

    const resetColor =
      () => {

        pdf.setTextColor(
          31,
          41,
          55
        )
      }


    const addPage =
      () => {

        pdf.addPage()

        cursorY =
          20
      }


    const ensureSpace =
      (
        requiredHeight
      ) => {

        if (
          cursorY +
          requiredHeight >
          PAGE_BOTTOM
        ) {

          addPage()
        }
      }


    const addLabel =
      (
        text
      ) => {

        ensureSpace(
          10
        )


        pdf.setFont(
          "helvetica",
          "bold"
        )


        pdf.setFontSize(
          8
        )


        pdf.setTextColor(
          37,
          99,
          235
        )


        pdf.text(
          String(
            text
          ).toUpperCase(),
          MARGIN,
          cursorY
        )


        cursorY +=
          6


        resetColor()
      }


    const addTitle =
      (
        title,
        subtitle = ""
      ) => {

        ensureSpace(
          subtitle
            ?
              26
            :
              18
        )


        pdf.setFont(
          "helvetica",
          "bold"
        )


        pdf.setFontSize(
          15
        )


        pdf.setTextColor(
          17,
          24,
          39
        )


        pdf.text(
          String(
            title
          ),
          MARGIN,
          cursorY
        )


        cursorY +=
          7


        if (
          subtitle
        ) {

          pdf.setFont(
            "helvetica",
            "normal"
          )


          pdf.setFontSize(
            8.5
          )


          pdf.setTextColor(
            100,
            116,
            139
          )


          const subtitleLines =
            pdf.splitTextToSize(
              String(
                subtitle
              ),
              CONTENT_WIDTH
            )


          pdf.text(
            subtitleLines,
            MARGIN,
            cursorY
          )


          cursorY +=
            (
              subtitleLines.length *
              4.2
            ) +
            4

        }

        else {

          cursorY +=
            4
        }


        resetColor()
      }


    const addParagraph =
      (
        text,
        options = {}
      ) => {

        if (!text) {

          return
        }


        const fontSize =
          options.fontSize ||
          8.8


        const lineHeight =
          options.lineHeight ||
          4.5


        const gapAfter =
          options.gapAfter ||
          5


        const color =
          options.color ||
          [
            71,
            84,
            103
          ]


        pdf.setFont(
          "helvetica",
          options.bold
            ?
              "bold"
            :
              "normal"
        )


        pdf.setFontSize(
          fontSize
        )


        pdf.setTextColor(
          ...color
        )


        const lines =
          pdf.splitTextToSize(
            String(
              text
            ),
            CONTENT_WIDTH
          )


        const height =
          (
            lines.length *
            lineHeight
          ) +
          gapAfter


        ensureSpace(
          height
        )


        pdf.text(
          lines,
          MARGIN,
          cursorY
        )


        cursorY +=
          height


        resetColor()
      }


    const addDivider =
      () => {

        ensureSpace(
          7
        )


        pdf.setDrawColor(
          226,
          232,
          240
        )


        pdf.line(
          MARGIN,
          cursorY,
          PAGE_WIDTH -
            MARGIN,
          cursorY
        )


        cursorY +=
          6
      }


    const addMetricCards =
      (
        cards
      ) => {

        const gap =
          4


        const count =
          Math.min(
            cards.length,
            4
          )


        const cardWidth =
          (
            CONTENT_WIDTH -
            gap *
              (
                count -
                1
              )
          ) /
          count


        const cardHeight =
          25


        ensureSpace(
          cardHeight +
          6
        )


        cards
          .slice(
            0,
            4
          )
          .forEach(
            (
              card,
              index
            ) => {

              const x =
                MARGIN +
                index *
                  (
                    cardWidth +
                    gap
                  )


              pdf.setFillColor(
                248,
                250,
                252
              )


              pdf.setDrawColor(
                226,
                232,
                240
              )


              pdf.roundedRect(
                x,
                cursorY,
                cardWidth,
                cardHeight,
                2,
                2,
                "FD"
              )


              pdf.setFont(
                "helvetica",
                "normal"
              )


              pdf.setFontSize(
                7
              )


              pdf.setTextColor(
                100,
                116,
                139
              )


              pdf.text(
                String(
                  card.label
                ),
                x +
                  cardWidth /
                  2,
                cursorY +
                  7,
                {
                  align:
                    "center"
                }
              )


              pdf.setFont(
                "helvetica",
                "bold"
              )


              pdf.setFontSize(
                12
              )


              pdf.setTextColor(
                17,
                24,
                39
              )


              pdf.text(
                String(
                  card.value
                ),
                x +
                  cardWidth /
                  2,
                cursorY +
                  16,
                {
                  align:
                    "center"
                }
              )


              if (
                card.note
              ) {

                pdf.setFont(
                  "helvetica",
                  "normal"
                )


                pdf.setFontSize(
                  5.8
                )


                pdf.setTextColor(
                  148,
                  163,
                  184
                )


                pdf.text(
                  String(
                    card.note
                  ),
                  x +
                    cardWidth /
                    2,
                  cursorY +
                    21,
                  {
                    align:
                      "center"
                  }
                )
              }

            }
          )


        cursorY +=
          cardHeight +
          6


        resetColor()
      }


    const addImage =
      (
        image,
        maxHeight = 90
      ) => {

        if (
          !image
        ) {

          return false
        }


        const ratio =
          image.width /
          image.height


        let height =
          maxHeight


        let width =
          height *
          ratio


        if (
          width >
          CONTENT_WIDTH
        ) {

          width =
            CONTENT_WIDTH


          height =
            width /
            ratio
        }


        ensureSpace(
          height +
          5
        )


        const x =
          MARGIN +
          (
            CONTENT_WIDTH -
            width
          ) /
          2


        pdf.addImage(
          image.dataUrl,
          "PNG",
          x,
          cursorY,
          width,
          height,
          undefined,
          "FAST"
        )


        cursorY +=
          height +
          5


        return true
      }


    const addChartUnavailable =
      (
        label
      ) => {

        addParagraph(
          `${label} tidak tersedia pada saat laporan dibuat.`,
          {
            fontSize:
              8,

            color:
              [
                148,
                163,
                184
              ]
          }
        )
      }


    // ========================================================
    // HALAMAN 1 - COVER
    // ========================================================

    pdf.setFillColor(
      37,
      99,
      235
    )


    pdf.rect(
      0,
      0,
      PAGE_WIDTH,
      72,
      "F"
    )


    // Logo cover
    if (
      reportLogo
    ) {

      try {

        const ratio =
          Math.min(
            25 /
              reportLogo.width,

            25 /
              reportLogo.height
          )


        const width =
          reportLogo.width *
          ratio


        const height =
          reportLogo.height *
          ratio


        pdf.addImage(
          reportLogo.dataUrl,
          "PNG",
          MARGIN,
          14,
          width,
          height,
          undefined,
          "FAST"
        )

      }

      catch (
        error
      ) {

        console.warn(
          "Logo cover tidak dapat ditambahkan:",
          error
        )
      }
    }


    pdf.setTextColor(
      255,
      255,
      255
    )


    pdf.setFont(
      "helvetica",
      "bold"
    )


    pdf.setFontSize(
      9
    )


    pdf.text(
      REPORT_APP_NAME.toUpperCase(),
      MARGIN +
        32,
      23
    )


    pdf.setFontSize(
      18
    )


    const titleLines =
      pdf.splitTextToSize(
        REPORT_TITLE,
        CONTENT_WIDTH -
          4
      )


    pdf.text(
      titleLines,
      MARGIN,
      42
    )


    pdf.setTextColor(
      71,
      84,
      103
    )


    pdf.setFont(
      "helvetica",
      "normal"
    )


    pdf.setFontSize(
      9
    )


    pdf.text(
      "Dashboard Analitik Kritik Publik Berbasis IndoBERT",
      MARGIN,
      91
    )


    cursorY =
      112


    const coverRows = [
      [
        "Dataset",
        analysisResult.filename ||
          "Dataset CSV"
      ],

      [
        "Jumlah Data Dianalisis",
        `${formatNumber(
          summary.total_valid
        )} data`
      ],

      [
        "Model Klasifikasi",
        REPORT_MODEL
      ],

      [
        "Jenis Klasifikasi",
        "Kritik Konstruktif, Kritik Nonkonstruktif, dan Tidak Layak/Bukan Kritik"
      ],

      [
        "Waktu Pembuatan Laporan",
        formatDate()
      ]
    ]


    coverRows.forEach(
      (
        [
          label,
          value
        ]
      ) => {

        ensureSpace(
          15
        )


        pdf.setFont(
          "helvetica",
          "bold"
        )


        pdf.setFontSize(
          7.5
        )


        pdf.setTextColor(
          100,
          116,
          139
        )


        pdf.text(
          label,
          MARGIN,
          cursorY
        )


        pdf.setFont(
          "helvetica",
          "normal"
        )


        pdf.setFontSize(
          8.2
        )


        pdf.setTextColor(
          31,
          41,
          55
        )


        const lines =
          pdf.splitTextToSize(
            String(
              value
            ),
            CONTENT_WIDTH -
              58
          )


        pdf.text(
          lines,
          MARGIN +
            58,
          cursorY
        )


        cursorY +=
          Math.max(
            10,
            lines.length *
              4.2
          )
      }
    )


    addDivider()


    addLabel(
      "Ringkasan Analisis"
    )


    addMetricCards(
      [
        {
          label:
            "Total Data",

          value:
            formatNumber(
              summary.total_valid
            )
        },

        {
          label:
            "Konstruktif",

          value:
            formatNumber(
              summary.konstruktif
            )
        },

        {
          label:
            "Nonkonstruktif",

          value:
            formatNumber(
              summary.nonkonstruktif
            )
        },

        {
          label:
            "Bukan Kritik",

          value:
            formatNumber(
              summary.bukan_kritik
            )
        }
      ]
    )


    addParagraph(
      `Sebanyak ${formatNumber(
        summary.head_tail_applied
      )} data menggunakan strategi Head-Tail 191+191 karena panjang token melebihi panjang input yang digunakan pada model. Nilai confidence menunjukkan tingkat keyakinan model terhadap prediksi individual dan bukan merupakan nilai akurasi dataset baru.`,
      {
        fontSize:
          8.2
      }
    )


    // ========================================================
    // HALAMAN 2 - EVALUASI MODEL
    // ========================================================

    addPage()


    addLabel(
      "Evaluasi Model"
    )


    addTitle(
      "Performa Model pada Data Uji",
      "Metrik berasal dari evaluasi final menggunakan testing set sebanyak 333 data yang dikunci selama pengembangan model."
    )


    addMetricCards(
      [
        {
          label:
            "Accuracy",

          value:
            "84,68%"
        },

        {
          label:
            "Precision Macro",

          value:
            "82,47%"
        },

        {
          label:
            "Recall Macro",

          value:
            "81,38%"
        },

        {
          label:
            "Macro-F1",

          value:
            "81,89%"
        }
      ]
    )


    addParagraph(
      "IndoBERT Seed 42 — Model Final digunakan sebagai model utama dan dibandingkan dengan baseline SVM-TF-IDF menggunakan testing set yang sama."
    )


    if (
      !addImage(
        modelChart,
        82
      )
    ) {

      addChartUnavailable(
        "Grafik perbandingan IndoBERT dan SVM-TF-IDF"
      )
    }


    addParagraph(
      "Hasil pengujian final menunjukkan IndoBERT memperoleh Accuracy 84,68% dan Macro-F1 81,89%, sedangkan SVM-TF-IDF memperoleh Accuracy 75,08% dan Macro-F1 72,33%."
    )


    // ========================================================
    // HALAMAN 3 - DISTRIBUSI DAN CONFIDENCE
    // ========================================================

    addPage()


    addLabel(
      "Distribusi Hasil"
    )


    addTitle(
      "Komposisi Hasil Klasifikasi",
      "Distribusi mencakup tiga kelas hasil klasifikasi IndoBERT."
    )


    if (
      !addImage(
        distributionChart,
        88
      )
    ) {

      addChartUnavailable(
        "Grafik distribusi hasil klasifikasi"
      )
    }


    addParagraph(
      `Hasil klasifikasi menunjukkan ${formatNumber(
        summary.konstruktif
      )} data atau ${formatPercent(
        summary.persen_konstruktif
      )}% termasuk Kritik Konstruktif, ${formatNumber(
        summary.nonkonstruktif
      )} data atau ${formatPercent(
        summary.persen_nonkonstruktif
      )}% termasuk Kritik Nonkonstruktif, dan ${formatNumber(
        summary.bukan_kritik
      )} data atau ${formatPercent(
        summary.persen_bukan_kritik
      )}% termasuk Tidak Layak/Bukan Kritik.`
    )


    addDivider()


    addLabel(
      "Confidence Model"
    )


    addTitle(
      "Distribusi Tingkat Confidence",
      "Confidence menggambarkan tingkat keyakinan IndoBERT terhadap kelas yang diprediksi."
    )


    if (
      !addImage(
        confidenceChart,
        72
      )
    ) {

      addChartUnavailable(
        "Grafik distribusi confidence"
      )
    }


    // ========================================================
    // HALAMAN 4 - TREND DAN KATA
    // ========================================================

    addPage()


    addLabel(
      "Tren Waktu"
    )


    addTitle(
      "Perkembangan Hasil Klasifikasi per Periode",
      "Perubahan jumlah hasil klasifikasi berdasarkan tanggal publikasi pada dataset."
    )


    if (
      !addImage(
        trendChart,
        84
      )
    ) {

      addChartUnavailable(
        "Grafik tren waktu"
      )
    }


    const validDates =
      analysisResult
        ?.analytics
        ?.trend
        ?.valid_dates ||
      0


    const invalidDates =
      analysisResult
        ?.analytics
        ?.trend
        ?.invalid_dates ||
      0


    addParagraph(
      `Analisis tren menggunakan ${formatNumber(
        validDates
      )} tanggal yang berhasil diproses dan ${formatNumber(
        invalidDates
      )} data dengan tanggal yang tidak dapat diproses.`
    )


    addDivider()


    addLabel(
      "Kata dan Topik"
    )


    addTitle(
      "Kata Dominan",
      "Visualisasi kata dominan digunakan sebagai konteks tambahan terhadap hasil klasifikasi."
    )


    if (
      !addImage(
        wordsChart,
        75
      )
    ) {

      addChartUnavailable(
        "Grafik kata dominan"
      )
    }


    // ========================================================
    // HALAMAN 5 - INSIGHT KONSTRUKTIF
    // ========================================================

    addPage()


    addLabel(
      "Insight Konstruktif"
    )


    addTitle(
      constructiveInsight
        ?.headline ||
        "Ringkasan Masukan Publik",

      "Interpretasi dibentuk dari pola data yang telah diprediksi sebagai Kritik Konstruktif."
    )


    if (
      constructiveInsight
        ?.summary_text
    ) {

      addParagraph(
        constructiveInsight
          .summary_text,

        {
          fontSize:
            9,

          lineHeight:
            4.8
        }
      )
    }


    if (
      constructiveInsight
    ) {

      addMetricCards(
        [
          {
            label:
              "Kritik Konstruktif",

            value:
              formatNumber(
                constructiveInsight
                  .total_constructive
              )
          },

          {
            label:
              "Terpetakan",

            value:
              formatNumber(
                constructiveInsight
                  .classified_count
              )
          },

          {
            label:
              "Masukan Lainnya",

            value:
              formatNumber(
                constructiveInsight
                  .unclassified_count
              )
          },

          {
            label:
              "Cakupan Tema",

            value:
              `${formatPercent(
                constructiveInsight
                  .coverage_percent
              )}%`,

            note:
              "bukan akurasi"
          }
        ]
      )
    }


    addParagraph(
      "Cakupan pemetaan tema menunjukkan proporsi kritik konstruktif yang memiliki indikator cukup kuat untuk dimasukkan ke kelompok tema yang telah ditentukan. Nilai ini bukan akurasi klasifikasi tema karena penelitian tidak menggunakan ground truth anotasi tema.",

      {
        fontSize:
          7.8,

        color:
          [
            100,
            116,
            139
          ]
      }
    )


    addDivider()


    addLabel(
      "Masukan Utama"
    )


    const keyPoints =
      constructiveInsight
        ?.key_points ||
      []


    if (
      keyPoints.length
    ) {

      keyPoints
        .slice(
          0,
          5
        )
        .forEach(
          (
            item,
            index
          ) => {

            const text =
              typeof item ===
                "string"

                ?
                  item

                :

                  item
                    ?.text ||

                  item
                    ?.label ||

                  item
                    ?.theme ||

                  JSON.stringify(
                    item
                  )


            addParagraph(
              `${index + 1}. ${text}`,
              {
                fontSize:
                  8.5,

                lineHeight:
                  4.5,

                gapAfter:
                  4
              }
            )
          }
        )

    }

    else {

      addParagraph(
        "Belum terdapat tema yang memiliki indikator cukup kuat untuk ditampilkan sebagai prioritas masukan."
      )
    }


    // ========================================================
    // HALAMAN 6 - CONTOH DATA DAN CATATAN
    // ========================================================

    addPage()


    addLabel(
      "Contoh Data"
    )


    addTitle(
      "Contoh Hasil Klasifikasi",
      "Beberapa contoh data ditampilkan untuk memberikan konteks terhadap hasil analisis. Data lengkap tersedia pada hasil ekspor CSV."
    )


    const examples =
      analysisResult
        ?.data
        ?.slice(
          0,
          6
        ) ||
      []


    examples.forEach(
      (
        item,
        index
      ) => {

        const predictionId =
          Number(
            item
              ?.[
                "Prediction ID"
              ]
          )


        const label =
          predictionId ===
            0

            ?

              "Kritik Nonkonstruktif"

            :

              predictionId ===
                1

              ?

                "Kritik Konstruktif"

              :

                "Tidak Layak/Bukan Kritik"


        const confidence =
          formatPercent(
            item
              ?.[
                "Confidence"
              ]
          )


        const fullText =
          String(
            item
              ?.[
                "Full text"
              ] ||
            ""
          )


        const title =
          `${index + 1}. ${label} | Confidence ${confidence}%`


        const titleLines =
          pdf.splitTextToSize(
            title,
            CONTENT_WIDTH -
              8
          )


        const textLines =
          pdf
            .splitTextToSize(
              fullText,
              CONTENT_WIDTH -
                8
            )
            .slice(
              0,
              7
            )


        const cardHeight =
          12 +
          (
            titleLines.length *
            4.2
          ) +
          (
            textLines.length *
            4
          )


        ensureSpace(
          cardHeight +
          5
        )


        pdf.setFillColor(
          250,
          251,
          252
        )


        pdf.setDrawColor(
          226,
          232,
          240
        )


        pdf.roundedRect(
          MARGIN,
          cursorY,
          CONTENT_WIDTH,
          cardHeight,
          2,
          2,
          "FD"
        )


        const titleColor =
          predictionId ===
            1

            ?

              [
                4,
                120,
                87
              ]

            :

              predictionId ===
                2

              ?

                [
                  91,
                  90,
                  170
                ]

              :

                [
                  194,
                  65,
                  12
                ]


        pdf.setFont(
          "helvetica",
          "bold"
        )


        pdf.setFontSize(
          8
        )


        pdf.setTextColor(
          ...titleColor
        )


        pdf.text(
          titleLines,
          MARGIN +
            4,
          cursorY +
            7
        )


        const bodyY =
          cursorY +
          7 +
          (
            titleLines.length *
            4.2
          ) +
          2


        pdf.setFont(
          "helvetica",
          "normal"
        )


        pdf.setFontSize(
          7.3
        )


        pdf.setTextColor(
          71,
          84,
          103
        )


        pdf.text(
          textLines,
          MARGIN +
            4,
          bodyY
        )


        cursorY +=
          cardHeight +
          5
      }
    )


    addDivider()


    addLabel(
      "Catatan Metodologis"
    )


    addTitle(
      "Interpretasi Laporan"
    )


    const notes = [
      "Model IndoBERT melakukan klasifikasi tiga kelas menjadi Kritik Nonkonstruktif, Kritik Konstruktif, dan Tidak Layak/Bukan Kritik.",

      "Dataset yang dianalisis sebaiknya telah melewati proses penyaringan relevansi karena model tidak memiliki kelas berita, bukan kritik, atau tidak relevan secara terpisah.",

      "Confidence adalah probabilitas atau tingkat keyakinan model terhadap prediksi individual dan bukan nilai akurasi pada dataset baru.",

      "Strategi Head-Tail 191+191 digunakan pada teks panjang agar bagian awal dan akhir teks tetap dapat direpresentasikan pada panjang masukan 384 token.",

      "Insight konstruktif dibentuk melalui pengelompokan rule-based terhadap hasil klasifikasi konstruktif. Cakupan pemetaan tema bukan nilai akurasi tema.",

      "Analisis pada dashboard bersifat stateless dan dataset tidak dimaksudkan untuk disimpan secara permanen oleh aplikasi."
    ]


    notes.forEach(
      (
        note,
        index
      ) => {

        addParagraph(
          `${index + 1}. ${note}`,
          {
            fontSize:
              7.8,

            lineHeight:
              4.2,

            gapAfter:
              3
          }
        )
      }
    )


    // ========================================================
    // WATERMARK PADA SEMUA HALAMAN
    // ========================================================

    const totalPages =
      pdf.getNumberOfPages()


    if (
      reportLogo
    ) {

      for (
        let page =
          1;

        page <=
          totalPages;

        page +=
          1
      ) {

        pdf.setPage(
          page
        )


        addWatermark(
          pdf,
          reportLogo
        )
      }
    }


    // ========================================================
    // FOOTER SEMUA HALAMAN
    // ========================================================

    for (
      let page =
        1;

      page <=
        totalPages;

      page +=
        1
    ) {

      pdf.setPage(
        page
      )


      pdf.setDrawColor(
        226,
        232,
        240
      )


      pdf.line(
        MARGIN,
        PAGE_HEIGHT -
          13,

        PAGE_WIDTH -
          MARGIN,

        PAGE_HEIGHT -
          13
      )


      pdf.setFont(
        "helvetica",
        "normal"
      )


      pdf.setFontSize(
        6.7
      )


      pdf.setTextColor(
        148,
        163,
        184
      )


      pdf.text(
        `${REPORT_APP_NAME} | Penelitian Skripsi ${REPORT_YEAR}`,
        MARGIN,
        PAGE_HEIGHT -
          8
      )


      pdf.text(
        `Halaman ${page} dari ${totalPages}`,

        PAGE_WIDTH -
          MARGIN,

        PAGE_HEIGHT -
          8,

        {
          align:
            "right"
        }
      )
    }


    // ========================================================
    // SAVE PDF
    // ========================================================

    const outputName =
      `MBG_INSIGHT_LAPORAN_` +
      `${sanitizeFileName(
        analysisResult.filename
      )}_` +
      `${timestamp()}.pdf`


    pdf.save(
      outputName
    )


    return {

      success:
        true,

      filename:
        outputName,

      pages:
        totalPages,

      charts: {

        model:
          Boolean(
            modelChart
          ),

        confidence:
          Boolean(
            confidenceChart
          ),

        distribution:
          Boolean(
            distributionChart
          ),

        trend:
          Boolean(
            trendChart
          ),

        words:
          Boolean(
            wordsChart
          )
      }
    }
  }