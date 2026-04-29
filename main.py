"""
Code Healer — AI-Powered Code Review Server
Backend powered by FastAPI + Google Gemini API
"""

import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Gemini Client Setup
# ---------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
gemini_client = None

if GEMINI_API_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[Code Healer] Failed to initialize Gemini client: {e}")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(title="Code Healer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ReviewRequest(BaseModel):
    code: str
    language: str = "auto"

# ---------------------------------------------------------------------------
# Senior Developer System Prompt
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are "Code Healer" — an elite senior software engineer with 20+ years of experience across every major programming language and framework. You perform meticulous, world-class code reviews.

When reviewing code, you MUST:
1. **Identify the language** if not specified
2. **Analyze deeply** — look for bugs, logic errors, security vulnerabilities, performance bottlenecks, memory leaks, race conditions, and anti-patterns
3. **Assess code quality** — readability, maintainability, naming conventions, structure, and adherence to language-specific best practices
4. **Provide actionable fixes** — don't just point out problems, fix them
5. **Be thorough but constructive** — explain WHY something is wrong and HOW the fix improves it

You MUST respond in **valid JSON only** with exactly this structure (no markdown, no code fences, just raw JSON):

{
  "language": "detected or confirmed language",
  "summary": "A 2-3 sentence overall assessment of the code quality",
  "score": <number 1-10 rating of code quality>,
  "issues": [
    {
      "severity": "critical|warning|info",
      "title": "Short issue title",
      "line": <approximate line number or null>,
      "description": "Detailed explanation of the problem",
      "fix": "How to fix it"
    }
  ],
  "suggestions": [
    {
      "title": "Suggestion title",
      "description": "What to improve and why",
      "priority": "high|medium|low"
    }
  ],
  "fixed_code": "The complete corrected version of the code with all issues fixed and suggestions applied"
}

Rules:
- Always return valid JSON. No extra text before or after.
- The "issues" array can be empty if the code is perfect.
- The "fixed_code" must be the COMPLETE corrected code, not a snippet.
- Be specific about line numbers when possible.
- Rate honestly: 1-3 = poor, 4-5 = needs work, 6-7 = decent, 8-9 = good, 10 = exceptional.
- For very short or trivial code, still provide a meaningful review.
"""

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/review")
async def review_code(request: ReviewRequest):
    """Submit code for AI-powered review."""

    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No code provided")

    if not GEMINI_API_KEY or not gemini_client:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Add your key to the .env file and restart the server."
        )

    # Build the user prompt
    lang_hint = f"Language: {request.language}" if request.language != "auto" else "Language: auto-detect"
    user_prompt = f"{lang_hint}\n\nCode to review:\n```\n{request.code}\n```"

    try:
        from google.genai import types

        # Model fallback chain: best → most reliable
        MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]

        last_error = None
        response = None

        for model_name in MODELS:
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3,
                        max_output_tokens=8192,
                    ),
                )
                break  # Success — stop trying
            except Exception as model_err:
                last_error = model_err
                print(f"[Code Healer] {model_name} failed: {model_err}, trying next...")
                continue

        if response is None:
            raise last_error or Exception("All models failed")

        raw = response.text.strip()

        # Strip markdown code fences if Gemini wraps the response
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
            raw = re.sub(r"\n?```\s*$", "", raw)

        review = json.loads(raw)
        return {"status": "success", "review": review}

    except json.JSONDecodeError:
        # If Gemini returns non-JSON, wrap it
        return {
            "status": "success",
            "review": {
                "language": request.language,
                "summary": response.text if response else "Unable to parse AI response",
                "score": 5,
                "issues": [],
                "suggestions": [],
                "fixed_code": request.code,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
    }


# ---------------------------------------------------------------------------
# Serve Frontend
# ---------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse("static/index.html")
