import time
import uuid
import json
import traceback
import requests
from flask import Blueprint, request, jsonify

from config import OLLAMA_URL
from core.db import log_admin_action
from core.auth import ALLOWED_DOMAIN, authenticate_admin
from services.rag_service import (
    create_embedding, check_semantic_cache, add_to_semantic_cache,
    semantic_search, rerank_chunks, create_enhanced_prompt,
    BITNET_CPP_AVAILABLE, run_bitnet_inference,
    clean_excerpt_references, clean_answer, remove_citations_from_text
)
from middleware.db_middleware import (
    save_chat_record, update_chat_satisfaction, save_user_feedback,
    reset_all_database_records, fetch_all_policies
)

chat_bp = Blueprint('chat', __name__)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    try:
        chat_process_start = time.time()
        data = request.json
        question = data.get("question", "")
        if not question or len(question.strip()) < 2:
            return jsonify({
                "answer": "I apologize, but I couldn't understand your question. Please provide a more specific query related to university policies.",
                "sources": [],
                "session_id": data.get("session_id", str(uuid.uuid4())),
                "chat_id": 0
            })
        
        user_email = data.get("user_email", "unknown@srmap.edu.in")
        session_id = data.get("session_id", str(uuid.uuid4()))
        
        if not user_email or not isinstance(user_email, str):
            print(f"⚠️ Invalid user_email received: {user_email}")
            return jsonify({"error": "Invalid email format"}), 400

        if not user_email.lower().endswith(f"@{ALLOWED_DOMAIN}"):
            return jsonify({"error": f"Only @{ALLOWED_DOMAIN} emails allowed"}), 403
        
        print(f"\n" + "="*60)
        print(f"💬 CHAT REQUEST")
        print(f"="*60)
        print(f"👤 User: {user_email}")
        print(f"❓ Question: {question}")
        
        question_lower = question.lower().strip()

        greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "how are you", "who are you"]
        is_greeting = any(question_lower == g or question_lower.startswith(g + " ") for g in greetings)
        
        if is_greeting:
            return jsonify({
                "answer": "Hello! I am your **PolicyHub AI** assistant. I can help you find specific information, rules, and guidelines from SRM University AP's official policy documents. How can I assist you with university policies today?",
                "sources": [],
                "session_id": session_id,
                "chat_id": 0
            })

        OFF_TOPIC_SIGNALS = [
            "capital of", "longest river", "tallest mountain", "largest country",
            "population of", "currency of", "language spoken in",
            "square root", "square root of", "what is \u03c0", "calculate", "solve for",
            "derivative of", "integral of", "factorial",
            "write a python", "write a script", "write code", "python script",
            "javascript code", "html code", "sql query", "program to",
            "oscar", "emmy", "grammy", "who won", "box office", "movie", "film release",
            "singer", "actor", "celebrity", "top chart",
            "how to bake", "recipe for", "cook a", "calories in", "bake at",
            "speed of light", "distance from earth", "diameter of", "age of the universe",
            "boiling point", "melting point",
            "who invented", "when was discovered", "president of", "prime minister of",
            "world war", "cold war", "year of independence",
            "meaning of life", "what is consciousness", "free will", "postmodernism",
        ]
        POLICY_SAFE_WORDS = [
            "policy", "srm", "university", "student", "attendance", "leave",
            "conduct", "harassment", "abuse", "logo", "email", "campus",
            "faculty", "department", "dean", "exam", "semester", "fee",
            "internship", "grant", "council", "ragging", "hostel", "library",
        ]
        has_off_topic_signal = any(sig in question_lower for sig in OFF_TOPIC_SIGNALS)
        has_policy_context = any(kw in question_lower for kw in POLICY_SAFE_WORDS)

        if has_off_topic_signal and not has_policy_context:
            print(f"  🚫 Off-topic guard triggered: '{question_lower[:80]}'")
            return jsonify({
                "answer": "I apologize, but I can only answer questions related to university policy documents. Please ask me about SRM University AP policies, rules, or guidelines.",
                "sources": [],
                "session_id": session_id,
                "chat_id": 0
            })

        list_keywords = ["what policies", "which policies", "list of policies", "available policies", "all policies", "collection of policies", "show policies", "policies available", "tell me everything you know", "what do you know"]
        has_list_keyword = any(question_lower == k or question_lower == k + "?" for k in list_keywords)
        has_list_verb = any(v in question_lower for v in ["list", "show", "tell me", "display"])
        has_policy_noun = any(n in question_lower for n in ["policy", "policies", "documents"])
        
        list_intent = has_list_keyword or \
                      (has_policy_noun and question_lower in ["how many", "how many?", "how many are there", "how many are there?"]) or \
                      (has_list_verb and has_policy_noun and len(question_lower.split()) <= 5) or \
                      (question_lower.strip('?') in ["what are the policies", "list policies", "show policies", "what do you know", "what policies do you have"])
        
        if list_intent:
            policies = fetch_all_policies()
            count = len(policies)
            
            if count == 0:
                answer = "I currently don't have access to any policy documents."
            else:
                policy_list = "\n".join([f"• {p['name']} ({p['policy_type'] or 'General'})" for p in policies])
                if "how many" in question_lower:
                    answer = f"I currently have access to {count} policy documents:\n\n{policy_list}"
                else:
                    answer = f"I have access to the following {count} policy documents:\n\n{policy_list}"
            
            chat_id = save_chat_record(user_email, question, answer, "[]")
            
            return jsonify({
                "answer": answer,
                "sources": [],
                "session_id": session_id,
                "chat_id": chat_id
            })

        else:
            question_embedding_bytes = create_embedding(question)
            cached_answer, cached_sources = check_semantic_cache(question_embedding_bytes)
            
            if cached_answer:
                chat_id = save_chat_record(user_email, question, cached_answer, cached_sources)
                return jsonify({
                    "answer": cached_answer,
                    "sources": json.loads(cached_sources),
                    "session_id": session_id,
                    "chat_id": chat_id,
                    "cached": True
                })

            min_relevance_score = 0.22
            results = semantic_search(question, n_results=50, min_score=min_relevance_score, query_embedding=question_embedding_bytes)
            
            if not results:
                return jsonify({
                    "answer": "I apologize, but I couldn't find any relevant policy information for your question. I am programmed to only answer questions based on university policy documents. Please try rephrasing your question or ask about a specific policy.",
                    "sources": [],
                    "session_id": session_id,
                    "chat_id": 0
                })

            all_policies = fetch_all_policies()
            policy_map = { p['name']: dict(p) for p in all_policies }
            
            category_latest = {}
            for p in all_policies:
                cat = p.get('category_name') or p.get('policy_type') or 'General'
                up_time = str(p.get('uploaded_at') or '')
                if cat not in category_latest or up_time > category_latest[cat]['uploaded_at']:
                    category_latest[cat] = {'name': p['name'], 'uploaded_at': up_time}

            pdf_scores = {}
            pdf_counts = {}
            pdf_total_score = {}
            pdf_best_score = {}
            pdf_chunks = {}
            
            for r in results:
                pdf = str(r['pdf'])
                if pdf not in pdf_scores:
                    pdf_scores[pdf] = []
                    pdf_counts[pdf] = 0
                    pdf_total_score[pdf] = 0.0
                    pdf_best_score[pdf] = 0.0
                    pdf_chunks[pdf] = []
                
                pdf_scores[pdf].append(float(r['score']))
                pdf_counts[pdf] += 1
                pdf_total_score[pdf] += float(r['score'])
                if float(r['score']) > pdf_best_score[pdf]:
                    pdf_best_score[pdf] = float(r['score'])
                pdf_chunks[pdf].append(r)
            
            best_pdf = ""
            best_pdf_score = 0.0
            best_pdf_avg = 0.0
            best_pdf_count = 0
            
            print(f"\n📊 PDF STATISTICS (with Recency Priority Boost):")
            for pdf in pdf_counts:
                count = pdf_counts[pdf]
                total = pdf_total_score[pdf]
                best = pdf_best_score[pdf]
                avg_score = total / count if count > 0 else 0.0
                
                count_factor = min(count / 10.0, 1.0) * 0.2
                base_combined_score = (avg_score * 0.4) + (best * 0.4) + count_factor
                
                recency_boost = 0.0
                pmeta = policy_map.get(pdf)
                if pmeta:
                    cat = pmeta.get('category_name') or pmeta.get('policy_type') or 'General'
                    if category_latest.get(cat) and category_latest[cat]['name'] == pdf:
                        recency_boost = 0.15

                combined_score = base_combined_score + recency_boost
                print(f"   • {pdf}: Chunks={count}, Avg={avg_score:.3f}, Best={best:.3f}, RecencyBoost={recency_boost:.2f}, Final={combined_score:.3f}")
                
                if combined_score > best_pdf_score:
                    best_pdf_score = combined_score
                    best_pdf = pdf
                    best_pdf_avg = avg_score
                    best_pdf_count = count
            
            print(f"\n🏆 BEST PDF: {best_pdf} (Combined: {best_pdf_score:.3f})")
            
            if best_pdf_score < 0.42:
                print(f"⚠️ Refusal: Score {best_pdf_score:.3f} too low")
                return jsonify({
                    "answer": "I can only answer questions related to SRM University AP policy documents.",
                    "sources": [],
                    "session_id": session_id,
                    "chat_id": 0
                })
            
            best_chunks = list(pdf_chunks[best_pdf])
            best_chunks.sort(key=lambda x: x['score'], reverse=True)
            top_candidates = [best_chunks[i] for i in range(min(20, len(best_chunks)))]
            top_chunks = rerank_chunks(question, top_candidates, top_k=5)
            
            sources = []
            for r in top_chunks:
                sources.append({
                    "pdf": r['pdf'],
                    "page": r['page'],
                    "similarity": r['score'],
                    "relevance": r.get('final_score', r['score']),
                    "text": r['text'],
                    "section": r.get('section', 'General'),
                    "text_snippet": r['text'][:200] + "..." if len(r['text']) > 200 else r['text']
                })
            
            prompt = create_enhanced_prompt(question, top_chunks, best_pdf)
            
            if prompt is None or str(prompt).startswith('__LOW_CONFIDENCE__'):
                parts = str(prompt or '').split('::')
                policy_name = parts[1] if len(parts) > 1 else best_pdf
                section_hint = parts[2] if len(parts) > 2 else 'the relevant section'
                answer = (
                    f"I found relevant documents in **{policy_name}**, but my confidence "
                    f"in generating an accurate answer is too low for this specific question. "
                    f"Please refer directly to **{section_hint}** in that document for the "
                    f"most accurate information."
                )
                return jsonify({'answer': answer, 'sources': [], 'chat_id': 0})
            
            try:
                selected_model = data.get("model", "phi3:mini").lower()
                
                if "bitnet" in selected_model:
                    model_used_label = "BitNet 1.58b"
                    if BITNET_CPP_AVAILABLE:
                        system_prompt = (
                            "You are the official PolicyHub AI for SRM University AP. "
                            "You must answer user questions based STRICTLY on the provided policy context, "
                            "and never invent or hallucinate rules. Be clear, concise, and professional."
                        )
                        user_prompt = f"Context from {best_pdf}:\n"
                        for c in top_chunks[:3]:
                            user_prompt += f"{c['text']}\n"
                        user_prompt += f"\nQuestion: {question}"
                        
                        print(f"  [BitNet] Running REAL BitNet inference via bitnet.cpp/llama-server")
                        try:
                            bitnet_answer = run_bitnet_inference(
                                system_prompt, user_prompt, max_tokens=300, temperature=0.1
                            )
                            if bitnet_answer:
                                answer = clean_excerpt_references(bitnet_answer)
                                answer = clean_answer(answer, best_pdf)
                                answer = remove_citations_from_text(answer)
                                
                                duration2 = time.time() - chat_process_start
                                confidence2 = best_pdf_score if 'best_pdf_score' in locals() else 0.0
                                chat_id2 = save_chat_record(
                                    user_email, question, answer, 
                                    json.dumps(sources) if 'sources' in locals() else '[]',
                                    duration2, confidence2, model_used_label
                                )
                                return jsonify({"answer": answer, "sources": sources if 'sources' in locals() else [], "session_id": session_id, "chat_id": chat_id2})
                            else:
                                print("  [BitNet] Empty response, falling back to phi3")
                                model = "phi3:mini"
                        except Exception as bn_err:
                            print(f"  [BitNet] Error: {bn_err} — falling back to phi3")
                            model = "phi3:mini"
                    else:
                        model = "phi3:mini"
                elif "qwen" in selected_model:
                    model = "qwen3.5:2b"
                    model_used_label = "Qwen 3.5"
                else:
                    model = "phi3:mini"
                    model_used_label = "Phi-3 Mini"
                
                response = requests.post(
                    OLLAMA_URL,
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.1,
                            "top_p": 0.9,
                            "num_predict": 512,
                            "num_ctx": 4096
                        }
                    },
                    timeout=60
                )
                
                if response.status_code != 200:
                    answer = f"Ollama model error: {response.text}"
                else:
                    raw_ans = response.json().get("response", "").strip()
                    if not raw_ans:
                        answer = "I'm sorry, I found the relevant documents but I'm unable to summarize the answer right now. Please check the 'Evidence' panel below for the specific policy details."
                    else:
                        answer = raw_ans
                
                answer = clean_excerpt_references(answer)
                answer = clean_answer(answer, best_pdf)
                answer = remove_citations_from_text(answer)
                
                refusal_phrases = [
                    "i can only answer questions related to srm university ap",
                    "i am programmed to only answer questions",
                    "i apologize, but this information is not mentioned",
                    "i cannot assist with",
                    "this information is not mentioned in the provided"
                ]
                if any(phrase in answer.lower() for phrase in refusal_phrases):
                    sources = []
                
            except Exception as e:
                print(f"⚠️ LLM error: {e}")
                answer = "I apologize, but I am having trouble processing your request right now. Please try again in a moment."
        
        duration = time.time() - chat_process_start
        confidence = best_pdf_score if 'best_pdf_score' in locals() else 0.0
        model_label = model_used_label if 'model_used_label' in locals() else 'Phi-3 Mini'
        
        chat_id = save_chat_record(
            user_email, question, answer, 
            json.dumps(sources) if 'sources' in locals() else '[]',
            duration, confidence, model_label
        )
        
        if "answer" in locals() and "sources" in locals() and \
           "I apologize" not in answer and "I can only answer questions" not in answer:
            try:
                sources_json = json.dumps(sources)
                add_to_semantic_cache(question, question_embedding_bytes, answer, sources_json)
            except Exception as e:
                print(f"⚠️ Failed to cache: {e}")
        
        return jsonify({
            "answer": answer,
            "sources": sources if 'sources' in locals() else [],
            "session_id": session_id,
            "chat_id": chat_id
        })
        
    except Exception as e:
        print(f"\n❌ CHAT ERROR: {e}")
        traceback.print_exc()
        return jsonify({"answer": f"Error: {str(e)}", "sources": []}), 500

@chat_bp.route("/chat/<int:chat_id>/satisfaction", methods=["POST"])
def update_satisfaction(chat_id):
    try:
        data = request.json
        satisfaction = data.get("satisfaction")
        
        if satisfaction is None:
            return jsonify({"error": "Satisfaction value required"}), 400
            
        update_chat_satisfaction(chat_id, satisfaction)
        return jsonify({"success": True, "message": "Satisfaction recorded"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chat_bp.route("/feedback", methods=["POST"])
def submit_feedback():
    try:
        data = request.json
        user_email = data.get("user_email")
        stars = data.get("stars")
        review = data.get("review", "")
        
        if not user_email or not stars:
            return jsonify({"error": "Email and stars required"}), 400
            
        save_user_feedback(user_email, stars, review)
        return jsonify({"success": True, "message": "Feedback recorded"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@chat_bp.route('/reset', methods=['POST'])
@authenticate_admin
def reset_database():
    reset_all_database_records()
    admin_user = request.authorization.username if request.authorization else "Admin"
    log_admin_action(admin_user, "RESET", "Database has been reset (policies, embeddings, chat history)")
    return jsonify({'success': True})
