import os
import re
import json
import typing
import numpy as np
import ollama
import requests
from config import *
from core.db import get_db, get_ist_now

CHUNK_SIZE = 300
CHUNK_OVERLAP = 50
CONFIDENCE_THRESHOLD = 0.38

# Cross-Encoder for semantic re-ranking
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

# BitNet 1.58B Configuration & Inference
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

import psycopg2

def check_semantic_cache(question_embedding_bytes, threshold=0.88):
    try:
        db = get_db()
        cached_items = db.execute("SELECT id, question, embedding FROM semantic_cache").fetchall()
        
        if not cached_items:
            return None, None
            
        q_vec = np.frombuffer(question_embedding_bytes, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0: return None, None

        best_score = 0
        best_match_id = None
        best_match_q = None
        
        for item in cached_items:
            it_vec = np.frombuffer(bytes(item['embedding']), dtype=np.float32)
            it_norm = np.linalg.norm(it_vec)
            if it_norm == 0: continue
            
            score = float(np.dot(q_vec, it_vec) / (q_norm * it_norm))
            
            if score > best_score:
                best_score = score
                best_match_id = item['id']
                best_match_q = item['question']
        
        if best_match_id:
            print(f"🔍 [CACHE DEBUG]: Closest match similarity: {best_score:.4f} with '{best_match_q}'")
            
            if best_score >= threshold:
                print(f"🚀 [CACHE HIT]: Similarity {best_score:.4f} exceeds threshold {threshold}")
                
                match_data = db.execute(
                    "SELECT answer, sources FROM semantic_cache WHERE id = %s",
                    (best_match_id,)
                ).fetchone()
                
                db.execute(
                    "UPDATE semantic_cache SET hit_count = hit_count + 1, last_hit = (NOW() + INTERVAL '5 hours 30 minutes') WHERE id = %s",
                    (best_match_id,)
                )
                db.commit()
                return match_data['answer'], match_data['sources']
            else:
                print(f"⏭️ [CACHE MISS]: Similarity {best_score:.4f} below threshold {threshold}")
            
        return None, None
    except Exception as e:
        print(f"⚠️ Cache lookup error: {e}")
        return None, None

def add_to_semantic_cache(question, embedding_bytes, answer, sources_json):
    try:
        db = get_db()
        db.execute(
            '''INSERT INTO semantic_cache (question, embedding, answer, sources) 
               VALUES (%s, %s, %s, %s)
               ON CONFLICT (question) 
               DO UPDATE SET embedding = EXCLUDED.embedding, answer = EXCLUDED.answer, sources = EXCLUDED.sources''',
            (question, psycopg2.Binary(embedding_bytes), answer, sources_json)
        )
        db.commit()
        print(f"💾 [CACHE STORE]: Cached new question '{question}'")
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
    """Enhanced semantic search including embedding reuse."""
    try:
        db = get_db()
        
        if query_embedding is None:
            query_embedding = create_embedding(query)
            
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
        
        doc_scores: typing.Dict[str, typing.List[float]] = {}
        doc_chunks: typing.Dict[str, typing.List[typing.Any]] = {}
        
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
        
        print(f"\n📊 Document with highest semantic relevance: {best_doc}")
        print(f"   Average semantic score: {best_avg:.3f}")
        print(f"   Other documents: {[(pdf, f'{avg:.3f}') for pdf, avg in doc_avg.items() if pdf != best_doc][:3]}")
        
        final_results = list(doc_chunks[best_doc])
        final_results.sort(key=lambda x: x['score'], reverse=True)
        
        return [final_results[i] for i in range(min(5, len(final_results)))]
        
    except Exception as e:
        print(f"❌ Semantic search error: {e}")
        return []

from services.prompt_service import build_dynamic_prompt

def create_enhanced_prompt(question, chunks, pdf_name, policy_type="General", model_type="phi3"):
    """Create a strictly-grounded prompt using dynamic 2-part prompt service. Returns None if confidence is too low."""
    if not chunks:
        return None
    
    top_score = chunks[0].get('score', 0)
    if top_score < (CONFIDENCE_THRESHOLD - 0.08):
        section = chunks[0].get('section', 'the relevant section')
        return f"__LOW_CONFIDENCE__::{pdf_name}::{section}"
    
    return build_dynamic_prompt(pdf_name, policy_type, chunks, question, model_type)

def clean_excerpt_references(answer):
    """Remove any remaining references to excerpts or similar phrases"""
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
    """Remove any references to other documents from the answer"""
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
    """Proactively remove ANY citations the LLM might have included anywhere in the text"""
    answer = re.sub(r'[\(\[]Policy Document:.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'[\(\[]Page\s*\d+.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'[\(\[]p\.?\s*\d+.*?[\)\]]', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'According to (?:page|p\.?)\s*\d+.*?,?\s*', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'\s+', ' ', answer).strip()
    return answer.strip()
