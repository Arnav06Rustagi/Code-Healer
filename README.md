# 🩺 Code Healer

**Instant AI-powered code reviews for 27+ programming languages.**

Paste your code, click review, and get a structured analysis from a senior-developer AI — complete with bug reports, security warnings, performance tips, and a fully corrected version of your file.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi) ![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-orange?logo=google) ![License](https://img.shields.io/badge/license-MIT-purple)

---

## ✨ Features

- **Zero setup for users** — paste code, click review, done
- **27+ languages** — Python, JS, TypeScript, Java, Rust, Go, C++, SQL, and more
- **Structured output** — issues are categorized by severity (critical / warning / info)
- **Line-level precision** — every issue includes the exact line number
- **One-click fix** — get the complete corrected file, not just snippets
- **Drag & drop upload** — drop any text file directly onto the editor
- **Model fallback chain** — automatically falls back from Gemini 2.5 Flash → 2.0 Flash if quota is hit

---

## 🖥️ Demo

```
Paste code → Select language → Run Review → Copy fixed code
```

The AI returns a JSON-structured review with:

| Field | Description |
|-------|-------------|
| `score` | 1–10 quality rating |
| `summary` | High-level assessment |
| `issues` | Bugs, security holes, style problems — with line numbers |
| `suggestions` | Prioritized improvement recommendations |
| `fixed_code` | Complete corrected version of your file |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/code-healer.git
cd code-healer

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# 4. Start the server
uvicorn main:app --reload --port 8000
```

Then open **http://localhost:8000** in your browser.

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
```

**Stack:**

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.115 + Uvicorn |
| AI | Google Gemini 2.5 Flash (via `google-genai` SDK) |
| Frontend | Vanilla HTML/CSS/JS (no build step) |
| Config | python-dotenv |

---

## 📁 Project Structure

```
code-healer/
├── main.py              # FastAPI server + Gemini integration + AI prompt
├── requirements.txt     # Python dependencies
├── .env                 # API key (not committed)
└── static/
    ├── index.html       # Page structure
    ├── styles.css       # Glassmorphism design system
    └── app.js           # Editor, API client, result rendering
```

---

## 🔌 API Reference

### `POST /api/review`

Submit code for review.

**Request body:**
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

### `GET /api/health`

Returns server status and whether the Gemini API key is configured.

---

## 🌐 Supported Languages

Python · JavaScript · TypeScript · Java · C · C++ · C# · Go · Rust · PHP · Ruby · Swift · Kotlin · Scala · R · Dart · Lua · Perl · Haskell · Elixir · SQL · HTML · CSS · Bash · PowerShell · YAML · JSON

---

## 🔒 Security Notes

- The Gemini API key is stored server-side in `.env` and never exposed to the browser
- All AI output is HTML-escaped before rendering (XSS protection)
- Input validation rejects empty submissions with a `400` response
- **For production:** restrict CORS origins, add rate limiting per IP, and consider authentication to prevent quota abuse

---

## 🗺️ Roadmap

- [ ] Review history with localStorage
- [ ] Streaming responses (SSE) for real-time output
- [ ] Diff view — side-by-side original vs fixed
- [ ] Dark / light theme toggle
- [ ] Multi-file upload (zip)
- [ ] GitHub integration — review pull requests directly
- [ ] Shareable review links
- [ ] User accounts + saved review history

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE)

---

Built with [FastAPI](https://fastapi.tiangolo.com/) and [Google Gemini](https://deepmind.google/technologies/gemini/).
