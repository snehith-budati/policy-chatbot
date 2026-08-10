import os
import re
import json
import typing
import hashlib
import numpy as np
import ollama
import requests
import psycopg2
from config import *
from core.db import get_db, get_ist_now

CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
CONFIDENCE_THRESHOLD = 0.38

try:
    from sentence_transformers import CrossEncoder
    _cross_encoder = None
    CROSS_ENCODER_AVAILABLE = True
    print("✅ sentence-transformers available - cross-encoder re-ranking enabled")
except ImportError:
    CROSS_ENCODER_AVAILABLE = False
    _cross_encoder = None
    print("⚠️ sentence-transformers not installed: pip install sentence-transformers")

def rerank_chunks(question: str, chunks: list, top_k: int = 3) -> list:
    global _cross_encoder
    if not CROSS_ENCODER_AVAILABLE or not chunks:
        return chunks[:top_k]
    
    try:
        if _cross_encoder is None:
            print("🔄 Loading deep cross-encoder model (High Accuracy Mode)...")
            _cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-12-v2', max_length=512)
            print("✅ Deep Cross-encoder loaded")
        
        pairs = [(question, c['text']) for c in chunks]
        scores = _cross_encoder.predict(pairs)
        
        ranked = sorted(
            zip(scores, chunks),
            key=lambda x: float(x[0]),
            reverse=True
        )
        return [c for _, c in ranked[:top_k]]
    except Exception as e:
        print(f"⚠️ Cross-encoder error (falling back): {e}")
        return chunks[:top_k]

BITNET_CPP_DIR = os.environ.get(
    'BITNET_CPP_DIR',
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'BitNet')
)
BITNET_MODEL_PATH = os.environ.get(
    'BITNET_MODEL_PATH',
    os.path.join(BITNET_CPP_DIR, 'models', 'Falcon3-1B-Instruct-1.58bit', 'ggml-model-i2_s.gguf')
)
_BITNET_SCRIPT = os.path.join(BITNET_CPP_DIR, 'run_inference.py')
BITNET_CPP_AVAILABLE = os.path.isfile(_BITNET_SCRIPT) and os.path.isfile(BITNET_MODEL_PATH)

if BITNET_CPP_AVAILABLE:
    print(f"[OK] BitNet.cpp found - real 1-bit BitNet 1.58b inference enabled")
else:
    print("[WARN] BitNet.cpp not configured - BitNet mode will fall back to phi3:mini")

BITNET_SERVER_URL = os.environ.get('BITNET_SERVER_URL', 'http://localhost:8080/completion')

def run_bitnet_inference(system_prompt: str, user_prompt: str, max_tokens: int = 512, temperature: float = 0.1) -> str:
    if not BITNET_CPP_AVAILABLE:
        raise RuntimeError("bitnet.cpp not installed — run backend/setup_bitnet.py")

    formatted_prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>\n"
    
    payload = {
        "prompt": formatted_prompt,
        "n_predict": max_tokens,
        "temperature": temperature,
        "stop": ["<|endoftext|>", "<|end|>"],
        "stream": False
    }

    try:
        response = requests.post(BITNET_SERVER_URL, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get('content', "").strip()
    except Exception as e:
        raise RuntimeError(f"BitNet Server error: {e}")

def chunk_text_intelligently(text_by_page):
    chunks = []
    
    for page_data in text_by_page:
        text = page_data['text']
        page_num = page_data['page']
        
        section_breaks = []
        
        numbered = list(re.finditer(r'\n\s*(\d+\.)\s+[A-Z]', text))
        for match in numbered:
            section_breaks.append(match.start())
        
        caps = list(re.finditer(r'\n\s*([A-Z][A-Z\s]{2,})\n', text))
        for match in caps:
            section_breaks.append(match.start())
        
        colon = list(re.finditer(r'\n\s*([A-Z][a-z]+:)\s', text))
        for match in colon:
            section_breaks.append(match.start())
        
        section_breaks.sort()
        section_breaks = [0] + section_breaks + [len(text)]
        
        for i in range(len(section_breaks) - 1):
            start = section_breaks[i]
            end = section_breaks[i + 1]
            
            section_text = text[start:end].strip()
            
            if not section_text or len(section_text.split()) < 5:
                continue
            
            section_title = "General"
            first_line = section_text.split('\n')[0].strip()
            
            if (first_line.isupper() or 
                first_line.endswith(':') or 
                re.match(r'^\d+\.', first_line)):
                section_title = re.sub(r':$', '', first_line)
            
            words = section_text.split()
            if len(words) > CHUNK_SIZE:
                for j in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
                    chunk_words = words[j:j + CHUNK_SIZE]
                    if len(chunk_words) > 20:
                        chunk_text = ' '.join(chunk_words)
                        chunks.append({
                            'text': chunk_text,
                            'page': page_num,
                            'section': section_title,
                            'chunk_index': len(chunks),
                            'is_header': j == 0
                        })
            else:
                chunks.append({
                    'text': section_text,
                    'page': page_num,
                    'section': section_title,
                    'chunk_index': len(chunks),
                    'is_header': True
                })
    
    return chunks

def create_embedding(text):
    try:
        response = ollama.embeddings(
            model="nomic-embed-text",
            prompt=text
        )
        embedding = np.array(
            response["embedding"],
            dtype=np.float32
        )
        return embedding.tobytes()
    except Exception as e:
        print("❌ Embedding error:", e)
        raise RuntimeError("Embedding generation failed")

def cosine_similarity(a_bytes, b_bytes):
    try:
        a = np.frombuffer(a_bytes, dtype=np.float32)
        b = np.frombuffer(b_bytes, dtype=np.float32)
        
        a_norm = np.linalg.norm(a)
        b_norm = np.linalg.norm(b)
        
        if a_norm == 0 or b_norm == 0:
            return 0
        
        return float(np.dot(a, b) / (a_norm * b_norm))
    except Exception as e:
        return 0

from services.chroma_service import qa_cache_chroma, policy_chroma

def normalize_question(question: str) -> str:
    if not question:
        return ""
    cleaned = re.sub(r'[^\w\s]', '', question.lower()).strip()
    return re.sub(r'\s+', ' ', cleaned)

def check_exact_cache(question: str):
    """Exact/High-similarity cache lookup in ChromaDB QA cache."""
    try:
        if not question:
            return None, None
        emb = create_embedding(question)
        answer, sources, sim = qa_cache_chroma.search_cache(emb, threshold=0.99)
        if answer:
            print(f"🚀 [ChromaDB EXACT CACHE HIT]: Match found for '{question}' (Sim: {sim:.4f})")
            return answer, sources
        return None, None
    except Exception as e:
        print(f"⚠️ Exact cache check error: {e}")
        return None, None

def check_semantic_cache(question_embedding_bytes_or_str, threshold=0.88):
    """
    Workflow 2 - Primary QA Cache Evaluation:
    Queries the physically isolated ChromaDB QA Cache instance (./chroma_db/qa_cache).
    If cosine similarity >= 0.88, returns cached (answer, sources).
    """
    try:
        if isinstance(question_embedding_bytes_or_str, str):
            question_embedding_bytes_or_str = create_embedding(question_embedding_bytes_or_str)

        answer, sources, similarity = qa_cache_chroma.search_cache(
            question_embedding_bytes_or_str, threshold=threshold
        )
        if answer:
            return answer, sources

        return None, None
    except Exception as e:
        print(f"⚠️ ChromaDB QA Cache lookup error: {e}")
        return None, None

def add_to_semantic_cache(question: str, embedding_bytes: bytes = None, answer: str = "", sources_json: str = "[]"):
    """
    Workflow 2 - QA Cache Store:
    Inserts Q&A prompt vector strictly into isolated ChromaDB QA Cache instance (./chroma_db/qa_cache).
    """
    if isinstance(embedding_bytes, str) and not answer:
        answer = embedding_bytes
        embedding_bytes = None
        
    try:
        if embedding_bytes is None and question:
            embedding_bytes = create_embedding(question)

        # 1. Primary: Save to physically isolated ChromaDB QA Cache instance
        qa_cache_chroma.add_to_cache(question, embedding_bytes, answer, sources_json)

        # 2. Secondary: Persist backup record to PostgreSQL
        db = get_db()
        emb_binary = psycopg2.Binary(embedding_bytes) if embedding_bytes else None

        db.execute(
            '''INSERT INTO semantic_cache (question, embedding, answer, sources) 
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (question) 
               DO UPDATE SET embedding = EXCLUDED.embedding, answer = EXCLUDED.answer, sources = EXCLUDED.sources''',
            (question, emb_binary, answer, sources_json)
        )
        db.commit()
    except Exception as e:
        print(f"⚠️ Cache storage error: {e}")

def get_policy_list_formatted():
    try:
        db = get_db()
        policies = db.execute('''
            SELECT name, chunks 
            FROM policies 
            ORDER BY uploaded_at DESC
        ''').fetchall()
        
        if policies:
            return "\n".join([
                f"  • {p['name']} ({p['chunks']} sections)" 
                for p in policies
            ])
        else:
            return "  • No policies uploaded yet"
    except Exception as e:
        print(f"Error getting policy list: {e}")
        return "  • Unable to fetch policy list"

def semantic_search(query, n_results=15, min_score=0.25, pdf_filter=None, query_embedding=None):
    try:
        if query_embedding is None:
            query_embedding = create_embedding(query)

        chroma_results = policy_chroma.search_policy_chunks(
            query_embedding, top_k=n_results, min_score=min_score, pdf_filter=pdf_filter
        )

        if chroma_results:
            doc_scores: typing.Dict[str, typing.List[float]] = {}
            for r in chroma_results:
                pdf = str(r['pdf'])
                if pdf not in doc_scores:
                    doc_scores[pdf] = []
                doc_scores[pdf].append(float(r['score']))

            doc_avg = {pdf: sum(scores)/len(scores) for pdf, scores in doc_scores.items() if len(scores) > 0}
            if doc_avg:
                best_doc = max(doc_avg, key=lambda k: doc_avg[k])
                best_avg = doc_avg[best_doc]
                print(f"\n📊 Document with highest semantic relevance (ChromaDB Policy DB): {best_doc}")
                print(f"   Average semantic score: {best_avg:.3f}")
            return chroma_results[:n_results]

        db = get_db()
        query_np = np.frombuffer(query_embedding, dtype=np.float32)
        
        query_str = '''
            SELECT e.*, p.name as pdf_name 
            FROM embeddings e 
            JOIN policies p ON e.policy_id = p.id
        '''
        params = []
        if pdf_filter:
            query_str += " WHERE p.name = %s"
            params.append(pdf_filter)
            
        chunks = db.execute(query_str, params).fetchall()
        
        if not chunks:
            return []
        
        scored_results = []
        for chunk in chunks:
            if chunk['embedding']:
                chunk_vec = np.frombuffer(bytes(chunk['embedding']), dtype=np.float32)
                similarity = float(np.dot(query_np, chunk_vec) / 
                                 (np.linalg.norm(query_np) * np.linalg.norm(chunk_vec)))
                
                if similarity >= min_score:
                    scored_results.append({
                        'text': chunk['text'],
                        'pdf': chunk['pdf_name'],
                        'page': chunk['page_number'] or 0,
                        'score': similarity,
                        'chunk_index': chunk['chunk_index'] or 0,
                        'section': chunk['section_title'] or 'General'
                    })
        
        if not scored_results:
            return []
        
        scored_results.sort(key=lambda x: x['score'], reverse=True)
        
        doc_scores = {}
        doc_chunks = {}
        
        for r in scored_results:
            pdf = str(r['pdf'])
            if pdf not in doc_scores:
                doc_scores[pdf] = []
                doc_chunks[pdf] = []
            doc_scores[pdf].append(float(r['score']))
            doc_chunks[pdf].append(r)
        
        doc_avg = {pdf: sum(scores)/len(scores) if len(scores) > 0 else 0.0 for pdf, scores in doc_scores.items()}
        
        best_doc = max(doc_avg, key=lambda k: doc_avg[k])
        best_avg = doc_avg[best_doc]
        
        print(f"\n📊 Document with highest semantic relevance (PostgreSQL Fallback): {best_doc}")
        print(f"   Average semantic score: {best_avg:.3f}")
        
        final_results = list(doc_chunks[best_doc])
        final_results.sort(key=lambda x: x['score'], reverse=True)
        
        return [final_results[i] for i in range(min(5, len(final_results)))]
        
    except Exception as e:
        print(f"❌ Semantic search error: {e}")
        return []

from services.prompt_service import build_dynamic_prompt

def create_enhanced_prompt(question, chunks, pdf_name, policy_type="General", model_type="phi3"):
    if not chunks:
        return None
    
    top_score = chunks[0].get('score', 0)
    if top_score < (CONFIDENCE_THRESHOLD - 0.08):
        section = chunks[0].get('section', 'the relevant section')
        return f"__LOW_CONFIDENCE__::{pdf_name}::{section}"
    
    return build_dynamic_prompt(pdf_name, policy_type, chunks, question, model_type)

def clean_excerpt_references(answer):
    phrases_to_remove = [
        "Based on the provided excerpt",
        "According to the excerpt",
        "In the provided text",
        "The excerpt states that",
        "As mentioned in the excerpt",
        "From the excerpt above",
        "Based on the information provided",
        "According to the document"
    ]
    
    for phrase in phrases_to_remove:
        answer = re.sub(phrase, "", answer, flags=re.IGNORECASE)
    
    answer = re.sub(r'\s+', ' ', answer).strip()
    return answer

def clean_answer(answer, pdf_name):
    other_pdfs = [
        "Email-Policy.pdf",
        "Sexual-Harassment-Policy.pdf", 
        "Substance-Abuse-Policy.pdf",
        "Use-of-Logo-and-Name-Policy.pdf"
    ]
    
    for other in other_pdfs:
        if other != pdf_name:
            patterns = [
                f"according to {other}",
                f"in {other}",
                f"from {other}",
                f"{other} states",
                f"{other} says"
            ]
            for pattern in patterns:
                answer = re.sub(pattern, "", answer, flags=re.IGNORECASE)
    
    answer = re.sub(r'\s+', ' ', answer).strip()
    return answer

def remove_citations_from_text(answer):
    answer = re.sub(r'[\(\[]Policy Document:.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'[\(\[]Page\s*\d+.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'[\(\[]p\.?\s*\d+.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'According to (?:page|p\.?)\s*\d+.*?,?\s*', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'\s+', ' ', answer).strip()
    return answer.strip()
