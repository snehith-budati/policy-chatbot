def get_system_prompt(policy_type="General", model_type="phi3", is_doc_id_intent=False):
    category_label = policy_type or "University Policy"
    
    if is_doc_id_intent:
        system_prompt = (
            f"You are PolicyHub AI, the official assistant for SRM University AP Policies.\n"
            "Your main task is to identify and name the specific policy document where the user's requested information is found.\n\n"
            "STRICT FORMATTING RULES:\n"
            "1. State the exact policy document name (e.g. '17.-student-internship-policy.pdf') clearly at the beginning of your response.\n"
            "2. Do NOT explain or summarize all the detailed policy contents unless explicitly requested by the user.\n"
            "3. Keep your answer natural, direct, and professional.\n"
        )
    else:
        system_prompt = (
            f"You are PolicyHub AI, the official assistant for SRM University AP Policies, specializing in {category_label} documents.\n"
            "Your task is to provide a clear, natural, direct, and strictly accurate answer based only on the provided policy document excerpts.\n\n"
            "STRICT FORMATTING & CONTENT RULES:\n"
            "1. Answer the user's question directly and naturally using clear sentences, bullet points, or structured paragraphs.\n"
            "2. NEVER format your response as a test, quiz, exam, or Q&A key (e.g. 'Q1:', 'Question:', 'Test Answer', 'Option A:').\n"
            "3. Do NOT quote raw 'EXCERPT 1' tags or mention internal prompt structures in your answer.\n"
            "4. Do NOT invent, assume, or guess rules not explicitly stated in the context.\n"
            "5. If the context does not contain the answer, politely state that the information is not mentioned in the policy.\n"
        )
    return system_prompt

def format_context_payload(pdf_name, policy_type, chunks, question, is_doc_id_intent=False):
    category_str = policy_type if policy_type else "General"
    
    payload = f"POLICY DOCUMENT: {pdf_name}\n"
    payload += f"DOCUMENT CATEGORY: {category_str}\n\n"
    payload += "RELEVANT POLICY EXCERPTS:\n"
    
    for idx, chunk in enumerate(chunks, 1):
        section_info = f" [Section: {chunk.get('section', 'General')}]" if chunk.get('section') else ""
        page_info = f" (Page {chunk.get('page', 0) + 1})" if 'page' in chunk else ""
        payload += f"\n--- EXCERPT {idx}{page_info}{section_info} ---\n{chunk['text']}\n"
        
    payload += f"\nUSER QUESTION: {question}\n\n"
    
    if is_doc_id_intent:
        payload += (
            "INSTRUCTION: State clearly which policy document contains the information regarding the user's question. "
            "Identify the document name directly and do not summarize all policy details."
        )
    else:
        payload += "INSTRUCTION: Based ONLY on the excerpts above, provide a direct, natural, and helpful answer to the user question."
        
    return payload

def build_dynamic_prompt(pdf_name, policy_type, chunks, question, model_type="phi3", is_doc_id_intent=False):
    if not chunks or len(chunks) == 0:
        return "__LOW_CONFIDENCE__"
        
    system_part = get_system_prompt(policy_type, model_type, is_doc_id_intent=is_doc_id_intent)
    user_payload_part = format_context_payload(pdf_name, policy_type, chunks, question, is_doc_id_intent=is_doc_id_intent)
    
    if "bitnet" in model_type.lower():
        full_prompt = f"<|system|>\n{system_part}\n<|user|>\n{user_payload_part}\n<|assistant|>\n"
    elif "qwen" in model_type.lower():
        full_prompt = f"<|im_start|>system\n{system_part}<|im_end|>\n<|im_start|>user\n{user_payload_part}<|im_end|>\n<|im_start|>assistant\n"
    else:
        full_prompt = f"System:\n{system_part}\n\nUser:\n{user_payload_part}\n\nAssistant:"
        
    return full_prompt
