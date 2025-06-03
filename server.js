// server.js

// --- Import Modules ---
import 'dotenv/config'; // Untuk memuat variabel lingkungan dari .env
import express from 'express';
import { Octokit } from '@octokit/rest'; // GitHub API client
import axios from 'axios'; // Untuk melakukan permintaan HTTP ke API AI
import fs from 'fs/promises'; // Node.js File System module (promise-based)
import { marked } from 'marked'; // Untuk mengkonversi Markdown ke HTML

// --- Inisialisasi Aplikasi Express ---
const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json()); // Middleware untuk mem-parsing JSON body dari request

// Middleware untuk menyajikan file statis dari folder 'reviews'
// Ini akan membuat file di folder 'reviews' bisa diakses publik via URL /reviews
app.use('/reviews', express.static('reviews'));

// --- Inisialisasi Klien GitHub API ---
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Mengambil token dari variabel lingkungan
});

// --- Fungsi untuk Berinteraksi dengan API AI ---
/**
 * Mengirim konten Pull Request ke Model AI untuk review.
 * Fungsi ini bisa dikonfigurasi untuk menggunakan OpenRouter atau Direct Anthropic API.
 *
 * @param {string} promptText - Teks prompt tambahan untuk AI.
 * @param {object} prContent - Konten PR (detail, file list, dan patch) sebagai konteks.
 * @returns {Promise<string>} - Hasil review mentah dari AI dalam format Markdown.
 */
async function getAIReview(promptText, prContent) {
    // --- Konfigurasi API AI (Pilih salah satu sesuai kebutuhan Anda) ---

    // OPSI 1: Menggunakan OpenRouter (Direkomendasikan untuk fleksibilitas model)
    const aiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const aiModel = process.env.OPENROUTER_MODEL; // Contoh: anthropic/claude-3-sonnet, openai/gpt-4o
    const aiApiKey = process.env.OPENROUTER_API_KEY;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`,
        'HTTP-Referer': 'http://localhost:3000' // Ganti dengan URL aplikasi Anda jika di-deploy
    };
    const bodyModelKey = 'model'; // Kunci untuk model di body request OpenRouter/OpenAI

    /*
    // OPSI 2: Menggunakan Direct Anthropic API
    const aiEndpoint = 'https://api.anthropic.com/v1/messages';
    const aiModel = process.env.ANTHROPIC_MODEL; // Contoh: claude-3-sonnet-20240229, claude-3-opus-20240229
    const aiApiKey = process.env.ANTHROPIC_API_KEY;
    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': aiApiKey, // Header khusus untuk Anthropic API Key
        'anthropic-version': '2023-06-01', // Versi API Anthropic yang direkomendasikan
    };
    const bodyModelKey = 'model'; // Kunci untuk model di body request Anthropic
    */

    try {
        // Gabungkan semua patch (perubahan kode) dari file yang diubah
        let allPatches = "";
        prContent.files.forEach(file => {
            if (file.patch) {
                allPatches += `\n--- File: ${file.filename} (Status: ${file.status}) ---\n`;
                allPatches += file.patch;
                allPatches += "\n";
            }
        });

        // Prompt Sistem: Memberikan instruksi kepada AI tentang perannya dan format output yang diinginkan
        const systemPrompt = `You are an expert code reviewer. Your task is to perform a detailed and actionable code review of the provided Pull Request (PR) changes.
        
        Focus on:
        - Potential bugs or logical errors.
        - Security vulnerabilities.
        - Code quality, readability, and maintainability.
        - Adherence to common best practices and design patterns.
        - Performance bottlenecks.
        
        For EACH identified issue, provide:
        - A clear description of the problem.
        - The **exact file name** where the issue is.
        - The **approximate line number or range** where the issue is found (referencing the diff/patch is crucial).
        - A **concrete suggestion** for how to fix or improve it.
        - Use code snippets where appropriate to illustrate the fix.
        
        If no issues are found, state that the code looks good and provide general positive feedback.
        Present your feedback in a clear, bulleted, or numbered list format, using Markdown headings (##) for major sections (e.g., "Issues to Address", "Positive Feedback").
        
        Example Issue Format:
        ## 1. Issue Title
        * **File:** \`filename.go\` (around line X-Y)
        * **Problem:** Description of the problem.
        * **Suggestion:** Concrete suggestion with code snippet if applicable.
        
        Example Positive Feedback Format:
        ## Positive Feedback
        1. Point 1
        2. Point 2
        
        Start the review with a clear title like: '# Code Review: [PR Title] PR#[PR Number]'.`;

        // Prompt Pengguna: Memberikan konteks PR dan perubahan kode ke AI
        const userPrompt = `Review the following Pull Request details and code changes.
        
        **Pull Request Title:** ${prContent.title}
        **PR URL:** ${prContent.html_url}
        **Author:** ${prContent.user_login}
        ${prContent.body ? `**PR Description:**\n${prContent.body}\n` : ''}
        
        **Changed Files and their Diffs (Patches):**
        \`\`\`diff
        ${allPatches || "No code changes detected in this PR."}
        \`\`\`
        
        Please provide your detailed code review based on the instructions.`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const requestBody = {
            [bodyModelKey]: aiModel, // Kunci 'model' dan nilai model AI
            messages: messages,
            temperature: 0.7, // Tingkat kreativitas AI (0.0 sangat faktual, 1.0 sangat kreatif)
            max_tokens: 3500, // Tingkatkan jika review sangat panjang
        };

        const response = await axios.post(aiEndpoint, requestBody, { headers });

        // Mengambil respons dari API AI (sesuaikan cara akses 'content' jika perlu)
        // Jika OpenRouter / OpenAI:
        return response.data.choices[0].message.content;

        // Jika Anthropic langsung (jika Anda menggunakan OPSI 2 di atas):
        // return response.data.content[0].text;

    } catch (error) {
        console.error('Error calling AI API:', error.response ? error.response.data : error.message);
        throw new Error('Gagal mendapatkan review dari AI. ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    }
}

// --- Endpoint Utama untuk Menerima Permintaan Review PR ---
app.post('/review-pull-request', async (req, res) => {
    // Menerima link PR dari body request
    const { prLink } = req.body;

    // Validasi input
    if (!prLink) {
        return res.status(400).json({ error: 'Mohon berikan link Pull Request di request body (prLink).' });
    }

    // Regex untuk menguraikan link GitHub PR menjadi owner, repo, dan pull_number
    const urlParts = prLink.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);

    if (!urlParts) {
        return res.status(400).json({ error: 'Format link PR tidak valid. Pastikan seperti: https://github.com/owner/repo/pull/123' });
    }

    const owner = urlParts[1];
    const repo = urlParts[2];
    const pull_number = parseInt(urlParts[3]);

    try {
        // 1. Ambil detail Pull Request dari GitHub API
        const { data: pullRequest } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: parseInt(pull_number),
        });

        // Ambil daftar file yang diubah dalam Pull Request
        const { data: files } = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: parseInt(pull_number),
        });

        // Kumpulkan konten Pull Request yang relevan untuk dikirim ke AI
        const prContent = {
            title: pullRequest.title,
            html_url: pullRequest.html_url,
            user_login: pullRequest.user.login,
            created_at: pullRequest.created_at,
            updated_at: pullRequest.updated_at,
            base_ref: pullRequest.base.ref,
            head_ref: pullRequest.head.ref,
            // Sertakan 'patch' (diff) dari setiap file, ini krusial untuk code review
            files: files.map(f => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch, // Inilah bagian yang berisi diff kode
            })),
            body: pullRequest.body, // Deskripsi PR dari pembuatnya
        };

        // 2. Kirim konten PR ke Model AI dan dapatkan hasil review mentah
        const aiReviewRawMarkdown = await getAIReview("Review this Pull Request. Focus on code quality, potential bugs, security, and adherence to best practices. Provide specific, actionable feedback.", prContent);

        // --- Proses Perapihan Tampilan dan Penyimpanan File ---

        // Buat Header Laporan untuk tampilan yang menarik (dalam Markdown)
        const reviewHeaderMarkdown = `✨ **Laporan Code Review Otomatis** ✨

---

Halo tim! 👋 Saya telah selesai me-review Pull Request ini:
**${prContent.title} (PR #${prContent.pull_number})**
🔗 Link PR: ${prContent.html_url}

Review ini difokuskan pada potensi masalah, keamanan, dan praktik terbaik.
Mohon perhatikan detail di bawah ini untuk perbaikan.
`;

        // Buat Footer Laporan (dalam Markdown)
        const reviewFooterMarkdown = `
---

**Catatan:** Review ini dihasilkan oleh AI. Pertimbangkan saran-saran ini dan diskusikan dengan tim Anda.
🤖 Semangat Coding!`;

        // Gabungkan semua bagian Markdown untuk di konversi ke HTML
        const fullReviewMarkdown = reviewHeaderMarkdown + aiReviewRawMarkdown + reviewFooterMarkdown;

        // Konversi Markdown lengkap menjadi HTML
        const reviewHtmlContent = marked.parse(fullReviewMarkdown);

        // Tambahkan styling dasar (CSS) ke HTML untuk tampilan yang lebih baik di browser
        const finalHtmlOutput = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Review: ${prContent.title} #${prContent.pull_number}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 20px; background-color: #f4f7f6; color: #333; }
        .container { max-width: 900px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
        code { background-color: #eee; padding: 2px 4px; border-radius: 4px; font-family: 'Consolas', 'Monaco', monospace; }
        pre { background-color: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 1em 0; }
        pre code { background-color: transparent; padding: 0; }
        strong { color: #e74c3c; } /* Menyorot bold, misal untuk nama file */
        ul { list-style-type: disc; margin-left: 20px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .emoji { font-size: 1.2em; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #ccc; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        ${reviewHtmlContent}
    </div>
</body>
</html>`;

        // Buat nama file yang unik berdasarkan detail PR dan timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlFileName = `pr-review-${owner}-${repo}-${pull_number}-${timestamp}.html`;
        const mdFileName = `pr-review-${owner}-${repo}-${pull_number}-${timestamp}.md`; // Tetap simpan versi Markdown juga
        const htmlFilePath = `./reviews/${htmlFileName}`;
        const mdFilePath = `./reviews/${mdFileName}`;

        // Pastikan direktori 'reviews' ada, jika tidak, buat
        try {
            await fs.access('./reviews');
        } catch (dirError) {
            if (dirError.code === 'ENOENT') {
                await fs.mkdir('./reviews', { recursive: true });
            } else {
                throw dirError; // Lempar error jika ada masalah lain
            }
        }

        // Simpan konten review ke kedua format file
        await fs.writeFile(htmlFilePath, finalHtmlOutput); // Simpan sebagai HTML
        await fs.writeFile(mdFilePath, fullReviewMarkdown); // Simpan sebagai Markdown mentah

        console.log(`Review disimpan ke: ${htmlFilePath} dan ${mdFilePath}`);

        // 3. Kirim hasil review kembali ke klien
        res.json({
            status: 'success',
            pull_request_url: prContent.html_url,
            ai_review_markdown: fullReviewMarkdown, // Memberikan versi Markdown asli ke klien
            ai_review_html_url: `http://localhost:${port}/reviews/${htmlFileName}`, // Link publik ke versi HTML
            output_files: { // Objek yang menunjukkan lokasi file yang disimpan
                html: htmlFilePath,
                markdown: mdFilePath
            }
        });

    } catch (error) {
        console.error('Error processing PR or saving file:', error.response ? error.response.data : error.message);
        if (error.status === 404) {
            res.status(404).json({ error: 'Pull Request atau repositori tidak ditemukan.' });
        } else if (error.status === 403) {
            res.status(403).json({ error: 'Akses GitHub API ditolak. Pastikan GITHUB_TOKEN memiliki izin yang cukup.' });
        } else {
            // Menangkap error dari getAIReview atau fs.writeFile atau lainnya
            res.status(500).json({ error: `Terjadi kesalahan internal server: ${error.message}` });
        }
    }
});

// --- Menjalankan Server ---
app.listen(port, () => {
    console.log(`MCP GitHub Server berjalan di http://localhost:${port}`);
    console.log('Siap menerima permintaan review Pull Request.');
});