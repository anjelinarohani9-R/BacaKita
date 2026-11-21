
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("bookDetail");
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    BacaKita.showMessage(container, "Buku tidak ditemukan. Silakan kembali ke koleksi.");
    return;
  }

  await BacaKita.init();

  if (!BacaKita.supabase) {
    BacaKita.showMessage(container, "Detail buku belum tersedia karena database belum dihubungkan.");
    return;
  }

  const book = await BacaKita.getBook(id);

  if (!book) {
    BacaKita.showMessage(container, "Buku tidak ditemukan atau belum diterbitkan.");
    return;
  }

  const safe = BacaKita.escapeHTML;
  const favorite = BacaKita.isFavorite(book.id);

  container.innerHTML = `
    <div class="detail-cover book-cover">
      ${BacaKita.cover(book)}
    </div>
    <div class="detail-info">
      <span class="eyebrow">${safe(book.category || "Koleksi BacaKita")}</span>
      <h1>${safe(book.title)}</h1>
      <p class="detail-author">Oleh ${safe(book.author || "Penulis tidak diketahui")}</p>
      <div class="detail-description">
        ${safe(book.description || "Belum ada deskripsi untuk buku ini.")}
      </div>
      <p class="detail-format">Format: EPUB</p>
      <div class="hero-actions">
        <a class="button button-primary" href="./reader.html?id=${encodeURIComponent(book.id)}">Baca Sekarang</a>
        <button class="button button-light" id="favoriteButton" type="button">
          ${favorite ? "♥ Hapus Favorit" : "♡ Tambah Favorit"}
        </button>
      </div>
    </div>
  `;

  document.getElementById("favoriteButton").addEventListener("click", event => {
    const added = BacaKita.toggleFavorite(book);
    event.currentTarget.textContent = added ? "♥ Hapus Favorit" : "♡ Tambah Favorit";
  });
});
