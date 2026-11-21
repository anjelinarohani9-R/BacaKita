
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("historyList");
  const clearButton = document.getElementById("clearHistory");

  function render() {
    let history = [];

    try {
      history = JSON.parse(localStorage.getItem("bk_history") || "[]");
    } catch {
      history = [];
    }

    if (!history.length) {
      container.innerHTML = `
        <div class="loading-card">
          Belum ada riwayat membaca.<br>
          <a class="text-link" href="./library.html">Mulai membaca buku →</a>
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    history.forEach(book => {
      const card = document.createElement("article");
      card.className = "book-card";

      const cover = document.createElement("a");
      cover.className = "book-cover";
      cover.href = `./detail.html?id=${encodeURIComponent(book.id)}`;

      if (book.cover_url) {
        const image = document.createElement("img");
        image.src = book.cover_url;
        image.alt = `Sampul ${book.title || "buku"}`;
        image.loading = "lazy";
        cover.appendChild(image);
      } else {
        cover.textContent = book.title || "BacaKita";
      }

      const info = document.createElement("div");
      info.className = "book-info";

      const heading = document.createElement("h3");
      heading.textContent = book.title || "Tanpa judul";

      const author = document.createElement("p");
      author.textContent = book.author || "Penulis tidak diketahui";

      const date = document.createElement("p");
      date.textContent = book.last_read
        ? `Terakhir dibaca: ${new Date(book.last_read).toLocaleString("id-ID")}`
        : "Pernah dibaca";

      const link = document.createElement("a");
      link.className = "button button-primary";
      link.href = `./reader.html?id=${encodeURIComponent(book.id)}`;
      link.textContent = "Lanjutkan Membaca";

      info.append(heading, author, date, link);
      card.append(cover, info);
      container.appendChild(card);
    });
  }

  clearButton.addEventListener("click", () => {
    const confirmed = confirm("Yakin ingin menghapus semua riwayat membaca?");

    if (confirmed) {
      localStorage.removeItem("bk_history");
      render();
    }
  });

  render();
});
