
document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("bookList");
  const search = document.getElementById("searchInput");
  const category = document.getElementById("categoryFilter");
  const count = document.getElementById("bookCount");
  const title = document.getElementById("resultTitle");

  const params = new URLSearchParams(window.location.search);
  const initialCategory = params.get("category");

  if (initialCategory) {
    category.value = initialCategory;
  }

  await BacaKita.init();

  if (!BacaKita.supabase) {
    BacaKita.showMessage(list, "Katalog belum terhubung. Konfigurasikan Supabase terlebih dahulu.");
    return;
  }

  const books = await BacaKita.getBooks();

  function render() {
    const keyword = search.value.trim().toLowerCase();
    const selectedCategory = category.value;

    const filtered = books.filter(book => {
      const matchesText =
        (book.title || "").toLowerCase().includes(keyword) ||
        (book.author || "").toLowerCase().includes(keyword);

      const matchesCategory =
        !selectedCategory || book.category === selectedCategory;

      return matchesText && matchesCategory;
    });

    title.textContent = selectedCategory || "Semua Buku";
    count.textContent = `${filtered.length} buku ditemukan`;

    if (!filtered.length) {
      BacaKita.showMessage(list, "Buku tidak ditemukan. Coba kata kunci lain.");
      return;
    }

    list.innerHTML = filtered.map(book => BacaKita.bookCard(book)).join("");
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
});
