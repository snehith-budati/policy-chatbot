def get_system_prompt(policy_type="General", model_type="phi3"):
    
    category_label = policy_type or "University Policy"
    
    system_prompt = (
        f"You are PolicyHub AI, An Assistant bot for SRM University AP Policies, specializing in {category_label} documents.\n"
        "Your task is to provide clear, factual, and strictly accurate answers based only on the provided policy document excerpts.\n\n"
        "STRICT RULES:\n"
        "1. Do NOT invent, assume, or guess rules not explicitly stated in the context.\n"
        "2. If the context does not contain the answer, politely reply that the information is not mentioned in the policy.\n"
        "3. Provide exact details, numbers, penalties, or deadlines whenever available.\n"
        "4. Keep your answer professional, well-structured, and concise in a short manner.\n"
    )
    return system_prompt

def format_context_payload(pdf_name, policy_type, chunks, question):
    """
    PART 2:
    """
    category_str = policy_type if policy_type else "General"
    
    payload = f"POLICY DOCUMENT: {pdf_name}\n"
    payload += f"DOCUMENT CATEGORY: {category_str}\n\n"
    payload += "RELEVANT POLICY EXCERPTS:\n"
    
    for idx, chunk in enumerate(chunks, 1):
        section_info = f" [Section: {chunk.get('section', 'General')}]" if chunk.get('section') else ""
        page_info = f" (Page {chunk.get('page', 0) + 1})" if 'page' in chunk else ""
        payload += f"\n--- EXCERPT {idx}{page_info}{section_info} ---\n{chunk['text']}\n"
        
    payload += f"\nUSER QUESTION: {question}\n\n"
    payload += "INSTRUCTION: Based ONLY on the excerpts above, provide a direct and accurate answer to the user question."
    return payload

def build_dynamic_prompt(pdf_name, policy_type, chunks, question, model_type="phi3"):
    
    # Guard: If no valid context chunks, flag low confidence
    if not chunks or len(chunks) == 0:
        return "__LOW_CONFIDENCE__"
        
    system_part = get_system_prompt(policy_type, model_type)
    user_payload_part = format_context_payload(pdf_name, policy_type, chunks, question)
    
    if "bitnet" in model_type.lower():
        full_prompt = f"<|system|>\n{system_part}\n<|user|>\n{user_payload_part}\n<|assistant|>\n"
    elif "qwen" in model_type.lower():
        full_prompt = f"<|im_start|>system\n{system_part}<|im_end|>\n<|im_start|>user\n{user_payload_part}<|im_end|>\n<|im_start|>assistant\n"
    else:
        # Standard Phi-3 / Ollama format
        full_prompt = f"System:\n{system_part}\n\nUser:\n{user_payload_part}\n\nAssistant:"
        
    return full_prompt
