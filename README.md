<div align="center">

  # PolicyHub AI
  ### **Voice-Enabled Enterprise RAG & Local LLM Policy Intelligence Platform**

  [![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
  [![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
  [![ChromaDB](https://img.shields.io/badge/Vector_Store-ChromaDB-007ACC?style=flat-square)](https://trychroma.com)
  [![Ollama](https://img.shields.io/badge/Local_LLM-Phi3%20%2F%20Qwen-412991?style=flat-square)](https://ollama.ai)
  [![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

  <p align="center">
    <b>A self-hosted, privacy-first conversational AI platform that enables employees and teams to query complex enterprise policies, compliance docs, and SOPs with instant citations, semantic caching, and voice synthesis.</b>
  </p>

</div>

---

## 💡 Why PolicyHub AI?

Enterprise policy manuals, HR guidelines, and compliance PDFs are notoriously dense and hard to search. Traditional keyword search misses semantic context, while standard cloud LLMs risk exposing confidential internal documents to third-party APIs.

**PolicyHub AI** is built from the ground up as a **100% self-hosted, local-first RAG architecture**:
- **Zero Data Leakage**: Ingests and queries documents locally using quantized models (Phi-3, Qwen 2.5, BitNet 1-bit).
- **Sub-50ms Semantic Cache**: Instant answers for frequently asked company questions without redundant LLM inference overhead.
- **Cross-Encoder Re-Ranking**: Filters out noise and ranks chunks using `sentence-transformers` for strict factual accuracy.
- **Enterprise Governance**: OTP-based authentication, role-based document access, and immutable audit logs.

---

## Core Architecture & Pipeline

```
[ PDF / Policy Upload ] ──► [ Multi-Engine OCR ] ──► [ Dynamic Chunking (300/50) ]
                                                            │
                                                            ▼
                                                   [ ChromaDB Vector Store ]
                                                            │
[ User Query (Text/Voice) ] ──► [ Semantic Cache Check ] ───┼──► (Cache Hit: <50ms)
                                       │ (Cache Miss)
                                       ▼
                             [ Vector Similarity Top-K ]
                                       │
                                       ▼
                            [ Cross-Encoder Re-Ranker ]
                                       │
                                       ▼
                       [ Quantized Local LLM (Phi-3/Qwen) ]
                                       │
                                       ▼
                         [ Streamed Response + Citations ]
```

---

## Key Features

###  1. High-Precision Retrieval-Augmented Generation (RAG)
- **Dynamic Semantic Chunking**: Documents are split into 300-token semantic chunks with 50-token overlap to maintain context across section boundaries.
- **Cross-Encoder Re-Ranking**: Retrieved chunks pass through a secondary cross-encoder scoring stage to ensure only high-confidence ($>0.38$) context reaches the prompt.
- **Source Citation & Traceability**: Responses explicitly cite section numbers, document titles, and paragraph references.

###  2. Voice-Enabled Interaction & OCR Ingestion
- **Voice In / Audio Out**: Integrated speech-to-text input and natural text-to-speech synthesis for hands-free querying.
- **Multi-Engine Document Pipeline**: Fallback OCR support via `pdf2image`, `Tesseract`, `EasyOCR`, and Apple Silicon `MLX` pipelines for scanned PDFs and tables.

###  3. Security, Authentication & Governance
- **OTP Verification**: Secure email/phone OTP login workflow for employees.
- **Rate Limiting & Protection**: Built-in `Flask-Limiter` middleware preventing endpoint exhaustion.
- **Admin Audit Trail**: Every upload, document deletion, and system prompt modification is logged with timestamps and admin IDs.

---

##  Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, React Router, Axios | Responsive conversational UI with voice capture & streaming bubbles |
| **Backend** | Python 3.10+, Flask, Flask-CORS | Modular REST API with route blueprints and middleware |
| **LLM Inference** | Ollama (Phi-3, Qwen 2.5), BitNet 1-bit | Low-memory local quantized model execution |
| **Vector Engine** | ChromaDB | Local vector indexing and cosine similarity search |
| **Re-Ranking** | Sentence-Transformers | Cross-encoder contextual re-scoring |
| **OCR & Ingestion**| Tesseract, EasyOCR, PyMuPDF | Robust extraction across digital and scanned PDF formats |
| **Deployment** | Docker, Docker Compose | Self-contained, portable container deployment |

---

##  Quick Start & Local Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** installed and running (`ollama run phi3` or `ollama run qwen2.5`)

### 1. Clone the Repository
```bash
git clone https://github.com/snehith-budati/policy-chatbot.git
cd policy-chatbot
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
> The backend server starts at `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```
> The web interface opens at `http://localhost:3000`.

---

##  Running with Docker

You can spin up the full stack using Docker:

```bash
cd backend
docker build -t policyhub-ai-backend .
docker run -p 5000:5000 policyhub-ai-backend
```

---

##  Repository Structure

```
policy-chatbot/
├── backend/
│   ├── app.py                # Application entry point & configuration
│   ├── config.py             # Global constants & environment parameters
│   ├── Dockerfile            # Production container configuration
│   ├── core/                 # Auth, Database (SQLite), Rate Limiter
│   ├── routes/               # API Blueprints (auth, chat, upload, admin, policies)
│   ├── services/             # RAG logic, OCR parser, Prompt templates
│   └── BitNet/               # 1-bit quantized LLM setup utilities
├── frontend/
│   ├── src/                  # React components, context providers, and UI
│   └── package.json
└── utilities/                # Helper evaluation & test scripts
```

---

##  Author

**Snehith Budati**
- **GitHub**: [@snehith-budati](https://github.com/snehith-budati)
- **LinkedIn**: [linkedin.com/in/snehit-budati-77125b255](https://linkedin.com/in/snehit-budati-77125b255)
- **Email**: [snehith0315@gmail.com](mailto:snehith0315@gmail.com)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<!-- Last updated: August 20, 2026 -->
