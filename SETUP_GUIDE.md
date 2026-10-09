# Local Development Setup Guide — TalentRank AI

Welcome to **TalentRank AI**, an AI-powered talent intelligence and automated candidate evaluation platform. This step-by-step checklist will guide you through running the application locally on your machine.

---

## Prerequisites
- **Node.js** (v18+ or v20+ recommended)
- **MongoDB** (running locally via Docker or local service on port 27017)
- **Google Chrome** (for automated headless LinkedIn scraping via Puppeteer)
- **Git**

---

## Step-by-Step Checklist

### 1. Install Dependencies
Install all required Node.js packages across the workspace:
```bash
npm install
```

### 2. Configure Environment Variables
Create a file named `apps/web/.env.local` (or copy `.env.example`):
```env
# Database
MONGODB_URI="mongodb://localhost:27017/aicon?directConnection=true"
MONGODB_DB="aicon"

# Better Auth
BETTER_AUTH_SECRET="aicon-hackathon-development-secret-key-32-chars-minimum"
BETTER_AUTH_URL="http://localhost:3000"
ENABLE_DEMO_LOGIN="true"
DEMO_USER_EMAIL="demo@example.com"

# AI Model Keys
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
OPENROUTER_API_KEY=""

# Chat Model: gemini-3.6-flash (recommended for fast ~3s streaming) or gemini-3.8-flash
CHAT_MODEL_ID="gemini-3.6-flash"

# Optional: Automated LinkedIn Scraper Session Cookie
LINKEDIN_SESSION_COOKIE=""
```

**Where to get your keys:**
- **Google Gemini API Key (`GOOGLE_GENERATIVE_AI_API_KEY`)**: Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate your key.
- **OpenRouter API Key (`OPENROUTER_API_KEY`)**: Optional fallback key from [OpenRouter](https://openrouter.ai/keys).
- **LinkedIn Session Cookie (`LINKEDIN_SESSION_COOKIE`)**: 
  - LinkedIn requires authentication to view profiles (unauthenticated requests are blocked with HTTP 999 Authwall).
  - To enable live URL scraping: Open LinkedIn in your browser (logged in) $\rightarrow$ Press `F12` (DevTools) $\rightarrow$ `Application` $\rightarrow$ `Cookies` $\rightarrow$ copy the value of the `li_at` cookie $\rightarrow$ paste it into `LINKEDIN_SESSION_COOKIE`.
  - **Zero-cookie Alternative:** You can also use the **"Paste Text"** or **"PDF / Resume"** tabs in the Import dialog to evaluate candidates with zero risk and 100% complete data.

---

### 3. Start MongoDB
If using Docker, start MongoDB with:
```bash
docker compose up -d
```
*(Or ensure your local MongoDB service is running on `mongodb://localhost:27017`)*.

---

### 4. Seed Initial Candidates (Optional)
To populate demo candidates:
```bash
npm run db:seed
```

---

### 5. Start the Development Server
```bash
npm run dev
```

---

### 6. Access the Application
Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

- **Login / Demo Access:** Click "Launch Demo Anonymously" or "Login as Demo User" to view the candidate leaderboard.
- **🎯 Dynamic Job Criteria:** Click the "Job Criteria" button in the dashboard to have Gemini expand your role requirements into a custom 0-100 rubric, must-haves, nice-to-haves, red flags, and interview questions. All candidates will automatically be rescored!
- **📥 Import Candidates:**
  - **Paste Text:** Paste profile text or resume directly for instant evaluation.
  - **PDF / Resume:** Upload a resume or LinkedIn's built-in **"Save to PDF"** export for 100% un-truncated data.
  - **URL Scrape:** Automated profile fetching.
- **🔍 Candidate Deep Dive:** Click into any candidate to view their AI Match Score, Strengths, Weaknesses, Verdict, and chat with the AI talent recruiter using RAG grounded directly in their profile history.
