
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const bookId = params.get("id");

  const message = $("readerMessage");
  const viewer = $("epubViewer");
  const titleElement = $("readerTitle");

  let book = null;
  let epubBook = null;
  let rendition = null;
  let currentCFI = null;
  let fontSize = 100;
  let darkMode = false;
  let currentPercentage = 0;

  const storageKey = key => `bk_${key}_${bookId}`;

  function showMessage(text) {
    message.textContent = text;
  }

  function saveProgress() {
    if (!bookId || !currentCFI) return;

    localStorage.setItem(storageKey("progress"), JSON.stringify({
      cfi: currentCFI,
      percentage: currentPercentage,
      updated_at: new Date().toISOString()
    }));
  }

  function getSavedProgress() {
    try {
      return JSON.parse(localStorage.getItem(storageKey("progress")) || "null");
    } catch {
      return null;
    }
  }

  function getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(storageKey("bookmarks")) || "[]");
    } catch {
      return [];
    }
  }

  function updateBookmarkButton() {
    const bookmarks = getBookmarks();
    const exists = bookmarks.some(item => item.cfi === currentCFI);

    $("bookmarkButton").textContent = exists ? "♥ Ditandai" : "♡ Tandai";
  }

  function updateProgress(location) {
    if (!location) return;

    currentCFI = location.start.cfi;

    const percentage = epubBook.locations.percentageFromCfi(currentCFI);
    currentPercentage = Math.max(0, Math.min(100, Math.round(percentage * 100)));

    $("readingProgress").textContent = `${currentPercentage}%`;
    saveProgress();
    updateBookmarkButton();
  }

  function renderTOC(items) {
    const nav = $("tocList");
    nav.replaceChildren();

    function addItems(entries, level = 0) {
      entries.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "toc-link";
        button.style.paddingLeft = `${10 + level * 12}px`;
        button.textContent = item.label || "Bagian buku";

        button.addEventListener("click", () => {
          rendition.display(item.href);
          if (window.innerWidth <= 700) {
            $("readerSidebar").classList.remove("open");
          }
        });

        nav.appendChild(button);

        if (item.subitems?.length) {
          addItems(item.subitems, level + 1);
        }
      });
    }

    addItems(items);

    if (!nav.children.length) {
      nav.textContent = "Daftar isi tidak tersedia.";
    }
  }

  function applyTheme() {
    if (!rendition) return;

    if (darkMode) {
      rendition.themes.override("color", "#f3e8ee");
      rendition.themes.override("background", "#302832");
      document.body.classList.add("reader-dark");
      $("themeToggle").textContent = "Mode Terang";
    } else {
      rendition.themes.override("color", "#493744");
      rendition.themes.override("background", "#ffffff");
      document.body.classList.remove("reader-dark");
      $("themeToggle").textContent = "Mode Gelap";
    }
  }

  function applyFontSize() {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
    }
  }

  async function getEpubUrl(bookData) {
    if (!bookData.epub_path) {
      throw new Error("File EPUB untuk buku ini belum tersedia.");
    }

    const config = window.BACAKITA_CONFIG;
    const bucket = config.STORAGE_BUCKET || "books";

    const { data } = BacaKita.supabase.storage
      .from(bucket)
      .getPublicUrl(bookData.epub_path);

    return data.publicUrl;
  }

  async function startReader() {
    if (!bookId) {
      showMessage("Buku tidak ditemukan. Kembali ke koleksi untuk memilih buku.");
      return;
    }

    if (!window.ePub) {
      showMessage("Komponen pembaca EPUB gagal dimuat. Periksa koneksi internet.");
      return;
    }

    await BacaKita.init();

    if (!BacaKita.supabase) {
      showMessage("Database belum dihubungkan. Pembaca belum dapat dibuka.");
      return;
    }

    showMessage("Mengambil informasi buku...");

    book = await BacaKita.getBook(bookId);

    if (!book) {
      showMessage("Buku tidak ditemukan atau belum diterbitkan.");
      return;
    }

    titleElement.textContent = book.title;
    BacaKita.saveHistory(book);

    try {
      const epubUrl = await getEpubUrl(book);

      showMessage("Memuat file EPUB...");

      epubBook = ePub(epubUrl);
      rendition = epubBook.renderTo(viewer, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "auto"
      });

      rendition.themes.default({
        body: {
          "font-family": "Georgia, serif",
          "line-height": "1.8",
          "padding": "0 12px"
        },
        p: {
          "line-height": "1.8"
        }
      });

      await epubBook.ready;
      await epubBook.locations.generate(1000);

      const navigation = await epubBook.loaded.navigation;
      renderTOC(navigation.toc || []);

      const saved = getSavedProgress();

      if (saved?.cfi) {
        await rendition.display(saved.cfi);
      } else {
        await rendition.display();
      }

      rendition.on("relocated", updateProgress);

      applyFontSize();
      applyTheme();

      showMessage("Buku siap dibaca. Selamat menikmati bacaan!");

    } catch (error) {
      console.error(error);
      showMessage(error.message || "Buku gagal dibuka. Periksa file EPUB dan pengaturan penyimpanan.");
    }
  }

  $("nextPage").addEventListener("click", () => {
    rendition?.next();
  });

  $("previousPage").addEventListener("click", () => {
    rendition?.prev();
  });

  $("fontIncrease").addEventListener("click", () => {
    fontSize = Math.min(180, fontSize + 10);
    applyFontSize();
  });

  $("fontDecrease").addEventListener("click", () => {
    fontSize = Math.max(70, fontSize - 10);
    applyFontSize();
  });

  $("themeToggle").addEventListener("click", () => {
    darkMode = !darkMode;
    applyTheme();
  });

  $("tocToggle").addEventListener("click", () => {
    $("readerSidebar").classList.toggle("open");
  });

  $("bookmarkButton").addEventListener("click", () => {
    if (!currentCFI) return;

    const bookmarks = getBookmarks();
    const exists = bookmarks.some(item => item.cfi === currentCFI);

    const updated = exists
      ? bookmarks.filter(item => item.cfi !== currentCFI)
      : [...bookmarks, {
          cfi: currentCFI,
          percentage: currentPercentage,
          created_at: new Date().toISOString()
        }];

    localStorage.setItem(storageKey("bookmarks"), JSON.stringify(updated));
    updateBookmarkButton();
  });

  window.addEventListener("beforeunload", saveProgress);

  startReader();
});
