
(() => {
  "use strict";

  const config = window.BACAKITA_CONFIG || {};
  const hasConfig =
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    config.SUPABASE_URL.startsWith("https://") &&
    !config.SUPABASE_URL.includes("MASUKKAN_") &&
    !config.SUPABASE_ANON_KEY.includes("MASUKKAN_");

  window.BacaKita = {
    supabase: null,
    books: [],

    async init() {
      if (!hasConfig || !window.supabase?.createClient) {
        console.info("BacaKita: Supabase belum dikonfigurasi.");
        return false;
      }

      try {
        this.supabase = window.supabase.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_ANON_KEY
        );
        return true;
      } catch (error) {
        console.error("Gagal menghubungkan Supabase:", error);
        return false;
      }
    },

    async getBooks() {
      if (!this.supabase) {
        return [];
      }

      const { data, error } = await this.supabase
        .from("books")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil buku:", error);
        return [];
      }

      this.books = data || [];
      return this.books;
    },

    async getBook(id) {
      if (!this.supabase || !id) return null;

      const { data, error } = await this.supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();

      if (error) {
        console.error("Gagal mengambil detail buku:", error);
        return null;
      }

      return data;
    },

    getFavorites() {
      try {
        return JSON.parse(localStorage.getItem("bk_favorites") || "[]");
      } catch {
        return [];
      }
    },

    isFavorite(id) {
      return this.getFavorites().some(item => item.id === id);
    },

    toggleFavorite(book) {
      const favorites = this.getFavorites();
      const exists = favorites.some(item => item.id === book.id);

      const updated = exists
        ? favorites.filter(item => item.id !== book.id)
        : [...favorites, {
            id: book.id,
            title: book.title,
            author: book.author || "",
            cover_url: book.cover_url || ""
          }];

      localStorage.setItem("bk_favorites", JSON.stringify(updated));
      return !exists;
    },

    getHistory() {
      try {
        return JSON.parse(localStorage.getItem("bk_history") || "[]");
      } catch {
        return [];
      }
    },

    saveHistory(book) {
      const history = this.getHistory().filter(item => item.id !== book.id);

      history.unshift({
        id: book.id,
        title: book.title,
        author: book.author || "",
        cover_url: book.cover_url || "",
        last_read: new Date().toISOString()
      });

      localStorage.setItem("bk_history", JSON.stringify(history.slice(0, 100)));
    },

    escapeHTML(value = "") {
      return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    },

    cover(book) {
      if (book.cover_url) {
        return `<img src="${this.escapeHTML(book.cover_url)}" alt="Sampul ${this.escapeHTML(book.title)}" loading="lazy">`;
      }

      return `<span>${this.escapeHTML(book.title || "BacaKita")}</span>`;
    },

    bookCard(book) {
      const title = this.escapeHTML(book.title || "Tanpa judul");
      const author = this.escapeHTML(book.author || "Penulis tidak diketahui");
      const id = encodeURIComponent(book.id);

      return `
        <article class="book-card">
          <a href="./detail.html?id=${id}" class="book-cover">
            ${this.cover(book)}
          </a>
          <div class="book-info">
            <h3>${title}</h3>
            <p>${author}</p>
            <a class="button button-primary" href="./detail.html?id=${id}">
              Lihat Buku
            </a>
          </div>
        </article>
      `;
    },

    showMessage(container, message) {
      if (container) {
        container.innerHTML = `
          <div class="loading-card">${this.escapeHTML(message)}</div>
        `;
      }
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const connected = await BacaKita.init();

    if (!connected) {
      BacaKita.showMessage(
        document.getElementById("featuredBooks"),
        "Koleksi buku akan tampil setelah koneksi database BacaKita diatur."
      );
      return;
    }

    const books = await BacaKita.getBooks();
    const featured = document.getElementById("featuredBooks");

    if (!featured) return;

    if (!books.length) {
      BacaKita.showMessage(featured, "Belum ada buku yang diterbitkan.");
      return;
    }

    featured.innerHTML = books
      .slice(0, 4)
      .map(book => BacaKita.bookCard(book))
      .join("");
  });
})();
