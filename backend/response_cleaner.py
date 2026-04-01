# #Added on 4th March - Response cleaning utilities (Task 5)
import re

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
        "According to the document",
        "Based on the policy document",
        "According to the policy"
    ]
    
    for phrase in phrases_to_remove:
        answer = re.sub(phrase, "", answer, flags=re.IGNORECASE)
    
    # Clean up extra spaces and punctuation
    answer = re.sub(r'\s+', ' ', answer).strip()
    answer = re.sub(r',\s*,', ',', answer)
    answer = re.sub(r'\.\s*\.', '.', answer)
    
    return answer

def make_concise(answer, max_sentences=1):
    """Trim answer to be concise"""
    if not answer:
        return answer
    
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', answer)
    
    if len(sentences) <= max_sentences:
        return answer
    
    # Take first few sentences
    concise = ' '.join(sentences[:max_sentences])
    
    # Ensure it ends properly
    if not concise.endswith(('.', '!', '?')):
        concise += '.'
    
    return concise

def remove_citations(answer):
    """Remove citation text if needed"""
    # Remove patterns like "(Page 1)" or "[Page 1]" at the end
    answer = re.sub(r'\s*[\(\[]Page\s*\d+[\)\]]\s*$', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'\s*[\(\[]p\.?\s*\d+[\)\]]\s*$', '', answer, flags=re.IGNORECASE)
    
    # Remove patterns like "(Policy Document: ..., page 1)"
    answer = re.sub(r'\s*[\(\[]Policy Document:.*?page\s*\d+[\)\]]\s*$', '', answer, flags=re.IGNORECASE)
    
    return answer.strip()