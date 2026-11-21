
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("favoriteList");

  function render() {
    let favorites = [];

    try {
      favorites = JSON.parse(localStorage.getItem("bk_favorites") || "[]");
    } catch {
      favorites = [];
    }

    if (!favorites.length) {
      container.innerHTML = `
        <div class="loading-card">
          Belum ada buku favorit.<br>
          <a class="text-link" href="./library.html">Jelajahi koleksi buku →</a>
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    favorites.forEach(book => {
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

      const read = document.createElement("a");
      read.className = "button button-primary";
      read.href = `./detail.html?id=${encodeURIComponent(book.id)}`;
      read.textContent = "Lihat Buku";

      const remove = document.createElement("button");
      remove.className = "button button-light";
      remove.type = "button";
      remove.textContent = "Hapus Favorit";
      remove.style.width = "100%";
      remove.style.marginTop = "7px";

      remove.addEventListener("click", () => {
        const updated = favorites.filter(item => item.id !== book.id);
        localStorage.setItem("bk_favorites", JSON.stringify(updated));
        render();
      });

      info.append(heading, author, read, remove);
      card.append(cover, info);
      container.appendChild(card);
    });
  }

  render();
});
