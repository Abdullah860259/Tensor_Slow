# 💡 Project Explained: The Simple Guide to the AICON AI Starter

Welcome! If you are new to the codebase, participating in a hackathon, or looking to understand how all the moving parts connect without drowning in technical jargon, this guide is for you.

---

## 🧭 What is this Project?

Imagine building an AI application like building a modern house.
Instead of spending days laying the foundation, wiring the electricity, plumbing the pipes, and installing the security locks, **this starter gives you a fully functional, move-in-ready foundation on Day 1**.

This repository is an **app-agnostic "AI Spine"**. It gives you:
1. **A User Interface**: Pre-built pages for landing, dashboards, artifact viewing, and AI chat.
2. **An Authentication System**: Instant guest login so judges and teammates don't need passwords or email verification.
3. **A Smart Database (MongoDB Atlas Vector Search)**: A unified place that stores both traditional data (users, items, chat history) and AI vector embeddings.
4. **An AI Brain (Gemini 2.5 Flash & AI SDK v7)**: Real-time streaming chat, structured data extraction, and RAG (Retrieval-Augmented Generation).
5. **An Observability Audit Trail**: Automatic logging of every token used, latency, and cost.

---

## 🔄 The Complete Workflow: How Everything Relates

Here is what happens when someone interacts with the application:

```
[ User Browser ]
       │
       ▼
1. Visit Landing Page ──► Click "Login as Demo User" or "Launch Demo Anonymously"
       │
       ▼
2. Better Auth Session ──► Issues an authenticated session cookie (no password needed!)
       │
       ▼
3. Workspace Dashboard ──► Reads artifacts from MongoDB (ItemModel)
       │
       ▼
4. Create New Item ──────► Next.js Server Action saves artifact to MongoDB
       │
       ▼
5. AI Extraction ────────► Gemini extracts structured summary, tags, & vector embedding (768 numbers)
       │
       ▼
6. View & Chat ──────────► In /items/[id], ask questions about your artifacts
       │
       ▼
7. Atlas Vector Search ──► Finds semantically related documents in MongoDB
       │
       ▼
8. Streaming RAG Chat ───► Gemini streams the answer back to the UI in real time
       │
       ▼
9. AI Run Auditing ──────► Token usage, reasoning tokens, and latency logged to MongoDB (AiRunModel)
```

---

## 🍃 What is MongoDB & How Are We Using It?

### What is MongoDB?
MongoDB is a **document database**. Unlike traditional SQL databases that force your data into rigid rows and columns like a spreadsheet, MongoDB stores data as flexible, JSON-like documents.

For AI applications, MongoDB is ideal because AI outputs (tags, metadata, chat history, extracted objects) are naturally JSON-formatted and evolve rapidly.

### How We Use MongoDB in This Project
We use a **Dual-Connection Architecture** inside `apps/web/src/lib/db.ts`:
1. **The Native Driver (`MongoClient`)**: 
   * A lightweight, direct connection to the database.
   * Used by our authentication library (**Better Auth**) for fast session lookups.
   * Cached as a single connection instance so we never overwhelm database connection limits.
2. **Mongoose (`connectMongoose`)**:
   * An Object Modeling library that gives structure to our data.
   * Defines our schemas (`ItemModel`, `ChatThreadModel`, `ChatMessageModel`, `AiRunModel`) with automatic data validation and type safety.

---

## ☁️ The Two MongoDB Versions: Local vs. Cloud

You can run this project in **two different modes** depending on your workflow:

| Feature | 🏠 Mode 1: Local Atlas (Docker) | ☁️ Mode 2: MongoDB Atlas (Cloud) |
| :--- | :--- | :--- |
| **Where it runs** | Directly on your computer via Docker | Hosted on MongoDB's cloud servers (AWS/GCP/Azure) |
| **Internet Required?** | ❌ No — works 100% offline | ✅ Yes — connects over the internet |
| **Vector Search Support?** | ✅ Yes — includes local `mongot` search engine | ✅ Yes — built into Atlas clusters |
| **Best For** | Local development, traveling, offline testing, fast reset | Team collaboration, hackathon demos, production deploy |
| **Connection String** | `mongodb://localhost/?directConnection=true` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/aicon` |

### How to Switch Between Local and Cloud:
Open your `.env.local` file and change the `MONGODB_URI` line:
* To run **locally**: Keep the default `MONGODB_URI="mongodb://localhost/?directConnection=true"` and run `docker compose up -d`.
* To run in the **cloud**: Replace with your Atlas connection string from the MongoDB Atlas dashboard.

---

## 🧠 What is Vector Search & RAG? (In Plain English)

### 1. Vector Embeddings
Computers don't understand the meaning of words; they only understand numbers.
When you save an item, we pass its content to Gemini's embedding model (`text-embedding-004`). The model converts the text into a list of **768 decimal numbers** (a "vector").

* The words *"automobile"* and *"car"* will have very similar vector numbers because their meanings are related.
* The words *"automobile"* and *"banana"* will have very different vector numbers.

### 2. Atlas Vector Search
Instead of searching for exact keywords (like finding rows where `title LIKE '%car%'`), MongoDB Atlas Vector Search compares the mathematical angle between vectors. It finds documents with **matching concepts**, even if they use completely different vocabulary.

### 3. RAG (Retrieval-Augmented Generation)
If you ask an AI: *"What did our architecture team decide about caching?"*, a generic AI doesn't know your company's private documents and might hallucinate.

**RAG solves this by turning the test into an open-book exam:**
1. Your question is converted into a vector.
2. MongoDB Vector Search retrieves the top 3 most relevant items from your database.
3. The server automatically feeds those 3 items to Gemini along with your question.
4. Gemini reads the retrieved context and answers your question accurately based on your actual data!

---

## 🛠️ The Tech Stack: What Each Tool Does

* **Next.js 16 (App Router)**: The full-stack React framework that powers both the frontend pages and backend API route handlers. Features Turbopack for lightning-fast builds.
* **React 19**: The modern UI library powering the user interface with interactive components and Server Actions.
* **Vercel AI SDK v7**: The unified AI framework that handles real-time response streaming, structured data generation (`generateObject`), and tool calling.
* **Better Auth**: A modern authentication system. We enabled the **Anonymous plugin** and created a **Demo User flow** so hackathon judges can immediately test the app without signing up.
* **Tailwind CSS v4 & shadcn/ui**: Clean, responsive UI components (cards, buttons, badges, dialogs) styled with modern design tokens.
* **FastAPI Sidecar (`apps/api/`)**: An optional Python backend. While the entire application runs in TypeScript, this sidecar is available if you need heavy Python libraries (like PyTorch, OpenCV, or document parsers).

---

## 🏁 Where to Go From Here

Now that you understand the concept and architecture, head over to the main **[README.md](README.md)** for:
* **The 5-Minute Quickstart**: Exact terminal commands to install and run the app.
* **Where to Enter API Keys**: Instructions on configuring `.env.local`.
* **The Testing Suite**: How to run `npm run typecheck`, `npm run test`, and `npm run evals`.
* **Troubleshooting Guide**: Solutions to common setup issues.
