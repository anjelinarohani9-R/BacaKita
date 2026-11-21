
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const $ = id => document.getElementById(id);
  const DB_NAME = "BacaKitaOffline";
  const STORE = "books";
  let cancelRequested = false;
  let db;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function saveBook(record) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function getAllSaved() {
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteSaved(id) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Tidak diketahui";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function setProgress(percent) {
    $("downloadProgress").style.width = `${percent}%`;
  }

  async function updateStorage() {
    if (!navigator.storage?.estimate) {
      $("storageStatus").textContent =
        "Informasi kapasitas penyimpanan tidak didukung browser ini.";
      return;
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    $("storageStatus").textContent =
      `Terpakai ${formatBytes(usage)} dari perkiraan ${formatBytes(quota)}.`;

    if (navigator.storage.persist) {
      const persistent = await navigator.storage.persisted();
      if (!persistent) {
        $("storageStatus").textContent +=
          " Penyimpanan belum mendapat status persisten.";
      }
    }
  }

  async function renderSaved() {
    const saved = await getAllSaved();
    const container = $("offlineList");

    $("offlineCount").textContent = `${saved.length} buku tersimpan`;

    if (!saved.length) {
      container.innerHTML = `
        <div class="loading-card">
          Belum ada buku yang disimpan secara offline.
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    saved.forEach(book => {
      const card = document.createElement("article");
      card.className = "book-card";

      const cover = document.createElement("div");
      cover.className = "book-cover";

      if (book.cover_url) {
        const image = document.createElement("img");
        image.src = book.cover_url;
        image.alt = `Sampul ${book.title}`;
        cover.appendChild(image);
      } else {
        cover.textContent = book.title;
      }

      const info = document.createElement("div");
      info.className = "book-info";

      const heading = document.createElement("h3");
      heading.textContent = book.title;

      const size = document.createElement("p");
      size.textContent = `Ukuran: ${formatBytes(book.size)}`;

      const read = document.createElement("a");
      read.className = "button button-primary";
      read.href = `./reader.html?id=${encodeURIComponent(book.id)}`;
      read.textContent = "Baca Buku";

      const remove = document.createElement("button");
      remove.className = "button button-light";
      remove.style.width = "100%";
      remove.style.marginTop = "7px";
      remove.textContent = "Hapus Unduhan";

      remove.addEventListener("click", async () => {
        await deleteSaved(book.id);
        await renderSaved();
        await updateStorage();
      });

      info.append(heading, size, read, remove);
      card.append(cover, info);
      container.appendChild(card);
    });
  }

  async function downloadBook(book) {
    const config = window.BACAKITA_CONFIG;
    const bucket = config.STORAGE_BUCKET || "books";

    if (!book.epub_path) {
      throw new Error(`File EPUB ${book.title} belum tersedia.`);
    }

    const { data } = BacaKita.supabase.storage
      .from(bucket)
      .getPublicUrl(book.epub_path);

    const response = await fetch(data.publicUrl);

    if (!response.ok) {
      throw new Error(`Gagal mengunduh ${book.title}.`);
    }

    const blob = await response.blob();

    if (!blob.size) {
      throw new Error(`File ${book.title} kosong.`);
    }

    await saveBook({
      id: book.id,
      title: book.title,
      author: book.author || "",
      cover_url: book.cover_url || "",
      epub_blob: blob,
      size: blob.size,
      downloaded_at: new Date().toISOString()
    });
  }

  async function downloadAll() {
    if (!navigator.onLine) {
      $("downloadStatus").textContent =
        "Kamu sedang offline. Sambungkan internet untuk mengunduh koleksi.";
      return;
    }

    if (!BacaKita.supabase) {
      $("downloadStatus").textContent =
        "Hubungkan Supabase terlebih dahulu sebelum mengunduh buku.";
      return;
    }

    cancelRequested = false;
    $("downloadAll").disabled = true;
    $("cancelDownload").disabled = false;
    setProgress(0);

    try {
      const books = await BacaKita.getBooks();

      if (!books.length) {
        $("downloadStatus").textContent = "Belum ada buku yang diterbitkan.";
        return;
      }

      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const available = (estimate.quota || 0) - (estimate.usage || 0);

        if (available <= 0) {
          throw new Error("Penyimpanan perangkat tidak mencukupi.");
        }
      }

      let completed = 0;
      let failed = 0;

      for (const book of books) {
        if (cancelRequested) break;

        $("downloadStatus").textContent =
          `Mengunduh ${completed + failed + 1} dari ${books.length}: ${book.title}`;

        try {
          await downloadBook(book);
          completed++;
        } catch (error) {
          console.error(error);
          failed++;
        }

        setProgress(
          Math.round(((completed + failed) / books.length) * 100)
        );
      }

      $("downloadStatus").textContent = cancelRequested
        ? `Unduhan dibatalkan. Berhasil: ${completed}, gagal: ${failed}.`
        : `Selesai. Berhasil: ${completed}, gagal: ${failed}.`;

    } catch (error) {
      $("downloadStatus").textContent = error.message;
    } finally {
      $("downloadAll").disabled = false;
      $("cancelDownload").disabled = true;
      await renderSaved();
      await updateStorage();
    }
  }

  $("downloadAll").addEventListener("click", downloadAll);

  $("cancelDownload").addEventListener("click", () => {
    cancelRequested = true;
    $("downloadStatus").textContent = "Menghentikan setelah unduhan buku saat ini selesai...";
  });

  try {
    db = await openDatabase();
    await updateStorage();
    await renderSaved();
    await BacaKita.init();
  } catch (error) {
    console.error(error);
    $("downloadStatus").textContent =
      "Penyimpanan offline tidak dapat dibuka di browser ini.";
  }
});
