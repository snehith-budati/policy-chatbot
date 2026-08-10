import os
import re
import json
import numpy as np
import chromadb
from chromadb.config import Settings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_CACHE_DIR = os.path.join(BASE_DIR, "chroma_db", "qa_cache")
POLICY_DB_DIR = os.path.join(BASE_DIR, "chroma_db", "policies")

os.makedirs(QA_CACHE_DIR, exist_ok=True)
os.makedirs(POLICY_DB_DIR, exist_ok=True)

def embedding_bytes_to_list(emb_bytes):
    if isinstance(emb_bytes, list):
        return emb_bytes
    if isinstance(emb_bytes, np.ndarray):
        return emb_bytes.astype(np.float32).tolist()
    if isinstance(emb_bytes, bytes):
        return np.frombuffer(emb_bytes, dtype=np.float32).tolist()
    return []

class QACacheChromaService:
    def __init__(self):
        print(f"📦 [ChromaDB QA Cache] Initializing isolated client at: {QA_CACHE_DIR}")
        self.client = chromadb.PersistentClient(
            path=QA_CACHE_DIR,
            settings=Settings(anonymized_telemetry=False, allow_reset=True)
        )
        self.collection = self.client.get_or_create_collection(
            name="qa_cache",
            metadata={"hnsw:space": "cosine"}
        )

    def get_question_id(self, question: str) -> str:
        cleaned = re.sub(r'[^\w\s]', '', question.lower()).strip()
        cleaned = re.sub(r'\s+', '_', cleaned)[:60]
        return f"qa_{cleaned}" if cleaned else "qa_default"

    def search_cache(self, query_embedding, threshold=0.88):
        try:
            emb_list = embedding_bytes_to_list(query_embedding)
            if not emb_list or self.collection.count() == 0:
                return None, None, 0.0

            results = self.collection.query(
                query_embeddings=[emb_list],
                n_results=1,
                include=["metadatas", "distances", "documents"]
            )

            if not results["ids"] or not results["ids"][0]:
                return None, None, 0.0

            distance = results["distances"][0][0]
            similarity = float(1.0 - distance)

            metadata = results["metadatas"][0][0]
            answer = metadata.get("answer", "")
            sources = metadata.get("sources", "[]")

            if similarity >= threshold:
                print(f"🚀 [ChromaDB QA Cache HIT]: Similarity {similarity:.4f} >= threshold {threshold}")
                doc_id = results["ids"][0][0]
                new_hits = int(metadata.get("hit_count", 1)) + 1
                metadata["hit_count"] = new_hits
                self.collection.update(ids=[doc_id], metadatas=[metadata])
                return answer, sources, similarity
            else:
                print(f"⏭️ [ChromaDB QA Cache MISS]: Max similarity {similarity:.4f} < threshold {threshold}")
                return None, None, similarity

        except Exception as e:
            print(f"⚠️ Error querying ChromaDB QA Cache: {e}")
            return None, None, 0.0

    def add_to_cache(self, question: str, query_embedding, answer: str, sources_json: str = "[]"):
        try:
            emb_list = embedding_bytes_to_list(query_embedding)
            if not emb_list or not question:
                return

            q_id = self.get_question_id(question)
            
            metadata = {
                "question": question,
                "answer": answer,
                "sources": sources_json if isinstance(sources_json, str) else json.dumps(sources_json),
                "hit_count": 1
            }

            self.collection.upsert(
                ids=[q_id],
                embeddings=[emb_list],
                documents=[question],
                metadatas=[metadata]
            )
            print(f"💾 [ChromaDB QA Cache STORE]: Cached question '{question}' (ID: {q_id[:8]}...)")
        except Exception as e:
            print(f"⚠️ Error storing to ChromaDB QA Cache: {e}")


class PolicyChromaService:
    def __init__(self):
        print(f"📚 [ChromaDB Policy DB] Initializing isolated client at: {POLICY_DB_DIR}")
        self.client = chromadb.PersistentClient(
            path=POLICY_DB_DIR,
            settings=Settings(anonymized_telemetry=False, allow_reset=True)
        )
        self.collection = self.client.get_or_create_collection(
            name="policy_chunks",
            metadata={"hnsw:space": "cosine"}
        )

    def add_policy_chunks(self, policy_id: int, pdf_name: str, chunks: list, embeddings: list):
        try:
            ids = []
            documents = []
            metadatas = []
            emb_lists = []

            for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                chunk_id = f"policy_{policy_id}_chunk_{idx}"
                emb_list = embedding_bytes_to_list(emb)
                
                ids.append(chunk_id)
                documents.append(chunk.get('text', ''))
                emb_lists.append(emb_list)
                metadatas.append({
                    "policy_id": int(policy_id),
                    "pdf_name": str(pdf_name),
                    "page_number": int(chunk.get('page', 0)),
                    "section_title": str(chunk.get('section', 'General')),
                    "chunk_index": int(chunk.get('chunk_index', idx)),
                    "is_header": bool(chunk.get('is_header', False))
                })

            if ids:
                self.collection.upsert(
                    ids=ids,
                    embeddings=emb_lists,
                    documents=documents,
                    metadatas=metadatas
                )
                print(f"✅ [ChromaDB Policy DB]: Indexed {len(ids)} chunks for '{pdf_name}'")
        except Exception as e:
            print(f"⚠️ Error indexing policy chunks into ChromaDB: {e}")

    def delete_policy_chunks(self, pdf_name: str):
        try:
            self.collection.delete(where={"pdf_name": str(pdf_name)})
            print(f"🗑️ [ChromaDB Policy DB]: Deleted chunks for '{pdf_name}'")
        except Exception as e:
            print(f"⚠️ Error deleting chunks from ChromaDB: {e}")

    def sync_from_postgres(self):
        try:
            import psycopg2
            from config import DATABASE_URL
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            cur.execute('''
                SELECT e.id, e.policy_id, p.name as pdf_name, e.chunk_index, e.text, e.embedding, e.page_number, e.section_title, e.is_header
                FROM embeddings e
                JOIN policies p ON e.policy_id = p.id
            ''')
            rows = cur.fetchall()
            cur.close()
            conn.close()

            if not rows:
                return

            ids = []
            documents = []
            metadatas = []
            embeddings = []

            for row in rows:
                emb_id, policy_id, pdf_name, chunk_index, text, emb_bytes, page_number, section_title, is_header = row
                chunk_id = f"policy_{policy_id}_chunk_{chunk_index}"
                emb_list = embedding_bytes_to_list(bytes(emb_bytes))
                
                ids.append(chunk_id)
                documents.append(text)
                embeddings.append(emb_list)
                metadatas.append({
                    "policy_id": int(policy_id),
                    "pdf_name": str(pdf_name),
                    "page_number": int(page_number or 0),
                    "section_title": str(section_title or "General"),
                    "chunk_index": int(chunk_index or 0),
                    "is_header": bool(is_header or False)
                })

            if ids:
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
                print(f"🔄 [ChromaDB Policy DB]: Auto-synced {len(ids)} chunks from PostgreSQL")
        except Exception as e:
            print(f"⚠️ Error syncing ChromaDB from PostgreSQL: {e}")

    def search_policy_chunks(self, query_embedding, top_k=15, min_score=0.25, pdf_filter=None):
        try:
            emb_list = embedding_bytes_to_list(query_embedding)
            if not emb_list or self.collection.count() == 0:
                self.sync_from_postgres()
                if self.collection.count() == 0:
                    return []

            where_clause = None
            if pdf_filter:
                where_clause = {"pdf_name": pdf_filter}

            results = self.collection.query(
                query_embeddings=[emb_list],
                n_results=min(top_k, max(1, self.collection.count())),
                where=where_clause,
                include=["metadatas", "distances", "documents"]
            )

            if not results["ids"] or not results["ids"][0]:
                return []

            scored_results = []
            for doc, meta, dist in zip(results["documents"][0], results["metadatas"][0], results["distances"][0]):
                similarity = float(1.0 - dist)
                if similarity >= min_score:
                    scored_results.append({
                        'text': doc,
                        'pdf': meta.get('pdf_name', ''),
                        'page': meta.get('page_number', 0),
                        'score': similarity,
                        'chunk_index': meta.get('chunk_index', 0),
                        'section': meta.get('section_title', 'General')
                    })

            scored_results.sort(key=lambda x: x['score'], reverse=True)
            return scored_results

        except Exception as e:
            print(f"⚠️ Error searching ChromaDB Policy DB: {e}")
            return []

qa_cache_chroma = QACacheChromaService()
policy_chroma = PolicyChromaService()
policy_chroma.sync_from_postgres()

