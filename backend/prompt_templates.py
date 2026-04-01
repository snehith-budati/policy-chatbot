# #Added on 4th March - Prompt templates with excerpt removal (Task 5)
# #Updated - Strengthened refusal instructions to prevent general-knowledge hallucinations

def create_enhanced_prompt(question, chunks, pdf_name):
    """Create a prompt that avoids using the word 'excerpt'"""
    
    context_sections = []
    for i, chunk in enumerate(chunks):
        context_sections.append(
            f"[From {pdf_name} - Page {chunk['page']+1}]\n{chunk['text']}"
        )
    
    context_text = "\n\n---\n\n".join(context_sections)
    
    prompt = f"""You are SRM University's official policy assistant. Your ONLY job is to answer questions about SRM University AP policy documents.

============================================================
POLICY DOCUMENT: {pdf_name}
============================================================

RELEVANT SECTIONS FROM THIS DOCUMENT:
{context_text}

============================================================
USER QUESTION: {question}
============================================================

CRITICAL RULES — READ BEFORE ANSWERING:

FORBIDDEN (never do these):
- Do NOT answer questions about general knowledge (geography, history, science, math, etc.)
- Do NOT answer coding questions, recipe questions, or pop-culture questions
- Do NOT use any knowledge from your training data that is NOT present in the RELEVANT SECTIONS above
- Do NOT guess, infer, or fabricate. If it is not in the sections above, do not say it.
- Do NOT answer math or computation questions (e.g., square roots, calculations)

MANDATORY REFUSAL — If the question is about ANY of the following, you MUST output EXACTLY the refusal phrase and NOTHING else:
  * General knowledge or trivia (capitals, rivers, mountains, distances, world records, etc.)
  * Mathematics, calculations, or computations (e.g. "what is the square root of...")
  * Coding, programming, or scripting requests
  * Movies, music, celebrities, awards, or pop culture
  * Food, cooking, or recipes
  * Any topic NOT present in the RELEVANT SECTIONS above

REFUSAL PHRASE (use verbatim when triggered): "I apologize, but I can only answer questions related to university policy documents."

ALLOWED ANSWERS:
- Only answer if the question is clearly about SRM University AP policies AND the answer is found in the RELEVANT SECTIONS above.
- Be ultra-concise — exactly ONE short sentence maximum.
- State the information as a direct fact with no preamble.
- Do NOT use words like "excerpt", "according to", or "based on".

YOUR ANSWER (ONE SENTENCE ONLY):"""

    return prompt


def create_concise_prompt(question, chunks, pdf_name):
    """Ultra-concise version for short answers"""
    
    # Extract key facts only
    facts = []
    for chunk in chunks[:2]:
        # Get first sentence only
        first_sent = chunk['text'].split('.')[0] + '.'
        facts.append(f"• {first_sent}")
    
    facts_text = "\n".join(facts)
    
    prompt = f"""POLICY FACTS from {pdf_name}:
{facts_text}

QUESTION: {question}

Answer in ONE short, factual sentence. If the question is not about university policy, say: "I apologize, but I can only answer questions related to university policy documents." """

    return prompt