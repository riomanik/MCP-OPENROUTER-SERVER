-----

# 🤖 MCP GitHub PR Reviewer

[](https://nodejs.org/)
[](https://expressjs.com/)
[](https://docs.github.com/en/rest)
[](https://openrouter.ai/)
[](https://opensource.org/licenses/MIT)

-----

## 📄 Deskripsi Proyek

**MCP GitHub PR Reviewer** adalah server Node.js yang mengimplementasikan sebagian dari **Model Context Protocol (MCP)** untuk mengotomatisasi proses *code review* pada Pull Request (PR) GitHub. Server ini berfungsi sebagai jembatan, mengambil detail PR dari GitHub, mengirimkannya ke Large Language Model (LLM) pilihan (melalui OpenRouter.ai atau langsung ke API Anthropic/OpenAI) untuk di-review, dan kemudian menyimpan hasilnya dalam format HTML dan Markdown yang rapi.

Tujuan utama proyek ini adalah mempercepat proses *code review*, memberikan *feedback* awal yang konsisten, dan memungkinkan tim developer untuk fokus pada diskusi yang lebih kompleks dan desain arsitektur.

-----

## ✨ Fitur Utama

  * **Review Kode Otomatis:** Dapatkan *feedback* detail tentang potensi *bug*, kerentanan keamanan, kualitas kode, dan praktik terbaik dari LLM.
  * **Integrasi GitHub:** Mengambil detail Pull Request (file yang diubah, *diff*, deskripsi) langsung dari GitHub API.
  * **Fleksibilitas LLM:** Mendukung integrasi dengan berbagai LLM populer melalui [OpenRouter.ai](https://openrouter.ai/) (seperti Claude, GPT, Mixtral) atau langsung ke API Anthropic/OpenAI.
  * **Output Informatif:** Hasil *review* disajikan dalam format HTML yang menarik (dengan CSS dasar) dan juga disimpan sebagai file Markdown.
  * **Link Publik Otomatis:** File review HTML dapat diakses melalui URL publik yang dihasilkan oleh server (berguna untuk berbagi atau *logging*).
  * **Struktur Proyek Modular:** Dirancang sebagai server backend yang dapat diintegrasikan dengan klien mana pun (misalnya, bot Discord, aplikasi web, atau agen AI lainnya).

-----

## 🚀 Instalasi

Ikuti langkah-langkah di bawah ini untuk mengatur dan menjalankan proyek secara lokal.

### Prasyarat

  * **Node.js** (Versi 18.x atau lebih tinggi direkomendasikan)
  * **Git**
  * Akun **GitHub** (untuk Personal Access Token)
  * Akun **OpenRouter.ai** (untuk API Key, jika menggunakan OpenRouter) ATAU Akun **Anthropic/OpenAI** (untuk API Key, jika langsung menggunakan API penyedia)

### Langkah-langkah

1.  **Clone Repositori:**

    ```bash
    git clone https://github.com/username/mcp-github-pr-reviewer.git
    cd mcp-github-pr-reviewer
    ```

    *(Ganti `https://github.com/username/mcp-github-pr-reviewer.git` dengan URL repositori kamu jika ini proyekmu.)*

2.  **Instal Dependensi:**

    ```bash
    npm install
    ```

3.  **Konfigurasi Variabel Lingkungan:**
    Buat file `.env` di direktori root proyek (`mcp-github-pr-reviewer/`) dan tambahkan variabel-variabel berikut:

    ```env
    PORT=3000
    GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE

    # --- PILIH SALAH SATU OPSI AI API DI BAWAH INI ---

    # OPSI 1: Untuk OpenRouter.ai (Rekomendasi untuk fleksibilitas)
    OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
    OPENROUTER_MODEL=anthropic/claude-3-sonnet # Contoh model: anthropic/claude-3-opus, openai/gpt-4o, mistralai/mistral-7b-instruct-v0.2

    # OPSI 2: Untuk Anthropic Langsung (Uncomment baris di bawah ini jika memilih opsi ini)
    # ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
    # ANTHROPIC_MODEL=claude-3-sonnet-20240229 # Contoh model: claude-3-opus-20240229, claude-3-haiku-20240307
    ```

      * **`GITHUB_TOKEN`**: Buat [GitHub Personal Access Token](https://www.google.com/search?q=https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens%23creating-a-personal-access-token-classic) dengan scope `repo` untuk dapat membaca detail Pull Request.
      * **`OPENROUTER_API_KEY`**: Dapatkan dari [dashboard OpenRouter.ai](https://openrouter.ai/keys).
      * **`ANTHROPIC_API_KEY`**: Dapatkan dari [dashboard Anthropic](https://console.anthropic.com/settings/keys).

4.  **Jalankan Server:**

    ```bash
    npm start
    ```

    Server akan berjalan di `http://localhost:3000`.

-----

## 💻 Penggunaan

Server ini mengekspos satu *endpoint* POST utama untuk memulai *code review*.

### Endpoint

  * **URL:** `http://localhost:3000/review-pull-request`
  * **Metode:** `POST`
  * **Header:** `Content-Type: application/json`

### Body Permintaan (JSON)

```json
{
  "prLink": "https://github.com/owner/repo/pull/123"
}
```

  * `prLink`: URL lengkap dari GitHub Pull Request yang ingin di-review.

### Contoh `curl` Request

Setelah server berjalan, buka terminal baru dan jalankan perintah `curl` berikut:

```bash
curl -X POST \
  http://localhost:3000/review-pull-request \
  -H 'Content-Type: application/json' \
  -d '{
    "prLink": "https://github.com/octocat/Spoon-Knife/pull/1"
  }'
```

*(Ganti `https://github.com/octocat/Spoon-Knife/pull/1` dengan link PR GitHub yang valid yang ingin kamu review.)*

### Contoh Respons (JSON)

```json
{
  "status": "success",
  "pull_request_url": "https://github.com/octocat/Spoon-Knife/pull/1",
  "ai_review_markdown": "# Code Review: Feat/pusat resolusi PR PR#167\n\n...",
  "ai_review_html_url": "http://localhost:3000/reviews/pr-review-octocat-Spoon-Knife-1-2025-06-03T10-15-00-000Z.html",
  "output_files": {
    "html": "./reviews/pr-review-octocat-Spoon-Knife-1-2025-06-03T10-15-00-000Z.html",
    "markdown": "./reviews/pr-review-octocat-Spoon-Knife-1-2025-06-03T10-15-00-000Z.md"
  }
}
```

  * **`ai_review_html_url`**: Salin URL ini dan tempelkan di *browser* kamu untuk melihat hasil *code review* dalam format HTML yang menarik.
  * File HTML dan Markdown juga akan disimpan secara lokal di direktori `reviews/` di root proyek kamu.

-----

## ⚙️ Konfigurasi Lanjutan

### Menyesuaikan Model AI

Kamu dapat dengan mudah mengubah model AI yang digunakan dengan mengubah nilai `OPENROUTER_MODEL` (atau `ANTHROPIC_MODEL` jika menggunakan Direct Anthropic) di file `.env`. Pastikan model yang kamu pilih kompatibel dengan API yang kamu gunakan.

### Kustomisasi Prompt AI

Jika kamu ingin mengubah fokus atau format *review* AI, modifikasi variabel `systemPrompt` dan `userPrompt` di dalam fungsi `getAIReview` di `server.js`. Ini adalah area utama untuk melakukan *prompt engineering*.

### Styling HTML Output

Kamu dapat menyesuaikan tampilan file HTML output dengan memodifikasi blok `<style>` di dalam variabel `finalHtmlOutput` di `server.js`.

-----

## ⚠️ Penanganan Error Umum

  * **`ERR_REQUIRE_ESM`**: Pastikan `server.js` dan `package.json` telah dikonfigurasi sebagai ES Module (lihat bagian Instalasi).
  * **`fs is not defined`**: Pastikan `import fs from 'fs/promises';` ada di bagian atas `server.js`.
  * **`Pull Request atau repositori tidak ditemukan` (404)**: Periksa kembali link PR yang kamu berikan, pastikan itu valid dan repositori bersifat publik atau kamu memiliki akses yang benar.
  * **`Akses GitHub API ditolak` (403)**: Pastikan `GITHUB_TOKEN` kamu valid dan memiliki izin (scope) `repo` yang cukup untuk membaca repositori.
  * **`Gagal mendapatkan review dari AI` (500)**: Periksa `OPENROUTER_API_KEY` (atau `ANTHROPIC_API_KEY`), `OPENROUTER_MODEL` (atau `ANTHROPIC_MODEL`), dan pastikan kamu memiliki saldo yang cukup di penyedia API AI yang kamu gunakan. Lihat log server untuk detail error dari API AI.

-----

## 🤝 Kontribusi

Kontribusi disambut baik\! Jika kamu memiliki ide atau perbaikan, silakan:

1.  Fork repositori ini.\
2.  Buat branch fitur baru (`git checkout -b feature/AmazingFeature`).
3.  Lakukan perubahan dan commit (`git commit -m 'Add some AmazingFeature'`).
4.  Push ke branch (`git push origin feature/AmazingFeature`).
5.  Buka Pull Request.

-----

## 📄 Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file [LICENSE](https://www.google.com/search?q=LICENSE) untuk detail lebih lanjut.

-----

**Dibuat dengan ❤️ oleh [Nama Kamu/Organisasi Kamu]**

*(Jangan lupa untuk membuat file `LICENSE` (misalnya, salin teks Lisensi MIT ke dalamnya) dan mengganti `[Nama Kamu/Organisasi Kamu]` dan `https://repositori.kemdikbud.go.id/` di tempat yang sesuai.)*