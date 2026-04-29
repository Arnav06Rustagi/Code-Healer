# 🩺 Code Healer

**Instant AI-powered code reviews for 27+ programming languages.**

Paste your code, click review, and get a structured analysis from a senior-developer AI — complete with bug reports, security warnings, performance tips, and a fully corrected version of your file. Every review is automatically saved to **IBM Cloudant** so your history persists across sessions.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi) ![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google) ![Cloudant](https://img.shields.io/badge/IBM-Cloudant-054ADA?logo=ibm) ![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

- **Zero setup for users** — paste code, click review, done
- **27+ languages** — Python, JS, TypeScript, Java, Rust, Go, C++, SQL, and more
- **Structured output** — issues categorized by severity (critical / warning / info)
- **Line-level precision** — every issue includes the exact line number
- **One-click fix** — get the complete corrected file, not just snippets
- **Drag & drop upload** — drop any text file directly onto the editor
- **Persistent review history** — every review saved to IBM Cloudant with full CRUD API
- **Model fallback chain** — auto-falls back from Gemini 2.5 Flash → 2.0 Flash on quota errors

---

## 🏗️ Architecture

```
Browser (HTML/CSS/JS)
    │
    └── POST /api/review
            │
        FastAPI (main.py)
            │
            ├── Gemini 2.5 Flash  ──┐
            └── Gemini 2.0 Flash  ──┴──► Structured JSON response
                                              │
                                    IBM Cloudant (history DB)
```

**Stack:**

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.115 + Uvicorn 0.34 |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK) |
| Database | IBM Cloudant (`ibmcloudant` SDK) |
| Frontend | Vanilla HTML/CSS/JS — no build step |
| Config | python-dotenv |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)
- *(Optional)* An [IBM Cloudant](https://www.ibm.com/cloud/cloudant) instance for persistent review history

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Arnav06Rustagi/Code-Healer.git
cd Code-Healer

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (see below)

# 4. Start the server
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** in your browser.

### Environment Variables

Create a `.env` file in the project root:

```env
# Required — AI review engine
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — persistent review history
CLOUDANT_URL=https://your-instance.cloudant.com
CLOUDANT_APIKEY=your_cloudant_iam_api_key
CLOUDANT_DB=code_healer_history        # optional, this is the default
```

> Cloudant is **optional**. The app works fully without it — reviews just won't persist between sessions. When configured, Code Healer auto-creates the database on first run.

---

## 📁 Project Structure

```
Code-Healer/
├── main.py              # FastAPI server, Gemini integration, Cloudant history
├── requirements.txt     # Python dependencies (5 packages)
├── .gitignore
└── static/
    ├── index.html       # Page structure
    ├── styles.css       # Glassmorphism design system
    └── app.js           # Editor, API client, result rendering
```

---

## 🔌 API Reference

### `POST /api/review`

Submit code for AI review. On success, the review is automatically saved to Cloudant history.

**Request:**
```json
{
  "code": "def add(a, b):\n    return a + b",
  "language": "python"
}
```

**Response:**
```json
{
  "status": "success",
  "review": {
    "language": "python",
    "summary": "Clean, simple function...",
    "score": 8,
    "issues": [
      {
        "severity": "info",
        "title": "Missing type hints",
        "line": 1,
        "description": "Parameters lack type annotations",
        "fix": "Use def add(a: int, b: int) -> int"
      }
    ],
    "suggestions": [],
    "fixed_code": "def add(a: int, b: int) -> int:\n    return a + b"
  }
}
```

---

### `GET /api/history`

Returns the 30 most recent reviews from Cloudant, sorted newest first.

**Response:**
```json
{
  "items": [
    {
      "_id": "uuid",
      "language": "python",
      "score": 8,
      "preview": "def add(a, b):  return a + b",
      "summary": "Clean, simple function...",
      "created_at": "2026-04-29T12:00:00+00:00"
    }
  ]
}
```

Returns `{"items": []}` silently if Cloudant is not configured.

---

### `GET /api/history/{doc_id}`

Retrieve a full review record by its Cloudant document ID — includes the complete original `code` and full `review` object.

---

### `DELETE /api/history/{doc_id}`

Delete a single review from Cloudant history.

**Response:** `{"status": "deleted"}`

---

### `DELETE /api/history`

Clear the entire review history from Cloudant.

**Response:** `{"status": "cleared"}`

---

### `GET /api/health`

Returns server and integration status.

**Response:**
```json
{
  "status": "ok",
  "gemini_configured": true,
  "cloudant_configured": true
}
```

---

## 🗄️ IBM Cloudant — Review History

Each review is stored as a JSON document in Cloudant with this shape:

```json
{
  "_id": "uuid-v4",
  "type": "review",
  "code": "original source code",
  "language": "python",
  "score": 8,
  "summary": "High-level assessment",
  "review": { /* full review object */ },
  "preview": "first 80 chars of code, newlines stripped",
  "created_at": "2026-04-29T12:00:00+00:00"
}
```

**Graceful degradation:** if Cloudant credentials are absent, the app starts normally — all history endpoints return empty/503 responses, and code review continues to work without any impact.

---

## 🌐 Supported Languages

Python · JavaScript · TypeScript · Java · C · C++ · C# · Go · Rust · PHP · Ruby · Swift · Kotlin · Scala · R · Dart · Lua · Perl · Haskell · Elixir · SQL · HTML · CSS · Bash · PowerShell · YAML · JSON

---

## 🔒 Security Notes

- Gemini API key and Cloudant credentials live in `.env` — never sent to the browser
- All AI output is HTML-escaped before DOM insertion (XSS protection)
- Empty code submissions are rejected with `HTTP 400`
- Cloudant authenticates via IBM IAM using the official SDK
- **For production:** restrict CORS origins from `*`, add per-IP rate limiting, and consider authentication to prevent quota abuse

---

## 🗺️ Roadmap

- [ ] Streaming responses (SSE) for real-time review output
- [ ] Diff view — side-by-side original vs fixed code
- [ ] Dark / light theme toggle
- [ ] Multi-file upload (zip)
- [ ] GitHub PR integration
- [ ] Shareable review links via Cloudant document IDs
- [ ] User accounts tied to Cloudant history

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push and open a Pull Request

---

## 📄 License

[MIT](LICENSE)

---

Built with [FastAPI](https://fastapi.tiangolo.com/), [Google Gemini](https://deepmind.google/technologies/gemini/), and [IBM Cloudant](https://www.ibm.com/cloud/cloudant).
