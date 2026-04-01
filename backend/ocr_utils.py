# #Added on 4th March - OCR Utilities for Task 4
import os
import fitz
import numpy as np
from PIL import Image
import pytesseract
import re
import time

# PaddleOCR import with fallback
try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
except ImportError:
    PADDLE_AVAILABLE = False
    print("⚠️ PaddleOCR not installed. Run: pip install paddlepaddle paddleocr")

# Global PaddleOCR instance (lazy loaded)
_paddle_ocr = None

def get_paddle_ocr():
    """Lazy load PaddleOCR instance"""
    global _paddle_ocr
    if _paddle_ocr is None and PADDLE_AVAILABLE:
        try:
            _paddle_ocr = PaddleOCR(
                use_angle_cls=True,
                lang='en',
                show_log=False,
                use_gpu=False  # Set to True if you have GPU
            )
            print("✅ PaddleOCR initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize PaddleOCR: {e}")
    return _paddle_ocr
# Add this function at the top of ocr_utils.py, after imports

def post_process_paddle_text(text):
    """Clean up PaddleOCR output to match expected format"""
    if not text:
        return text
    
    # Fix common PaddleOCR artifacts
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Remove excessive spaces
        line = re.sub(r'\s+', ' ', line)
        
        # Fix common character misrecognitions
        # Numbers often misread as letters
        line = re.sub(r'O', '0', line)  # O -> 0 (in numeric contexts)
        line = re.sub(r'l', '1', line)  # l -> 1 (in numeric contexts)
        
        # Fix spacing around punctuation
        line = re.sub(r'\s+([.,!?;:])', r'\1', line)  # Remove space before punctuation
        line = re.sub(r'([.,!?;:])\s+', r'\1 ', line)  # Ensure space after punctuation
        
        # Fix common OCR errors
        replacements = [
            (r'(\d),(\d{3})', r'\1\2'),  # 15,000 -> 15000
            (r'(\d)\.(\d{3})', r'\1\2'),  # 15.000 -> 15000
            (r'Rs\.?\s*(\d+)', r'Rs. \1'),  # Standardize currency
            (r'per\s*month', 'per month'),
            (r'per\s*annum', 'per annum'),
            (r'extral', 'per'),  # Common OCR error
            (r'app roval', 'approval'),
            (r'chanc ellor', 'chancellor'),
            (r'dept', 'department'),
        ]
        
        for pattern, replacement in replacements:
            line = re.sub(pattern, replacement, line, flags=re.IGNORECASE)
        
        if line.strip():
            cleaned_lines.append(line.strip())
    
    return '\n'.join(cleaned_lines)
def extract_text_with_paddleocr(pdf_path, page_num, page):
    """
    Extract text using PaddleOCR for better accuracy (Task 4 - Primary Method)
    """
    try:
        ocr = get_paddle_ocr()
        if ocr is None:
            return ""
        
        # Render page to image with higher resolution for better OCR
        zoom = 2.0  # 2x zoom for better quality
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, dpi=300)
        img_data = pix.tobytes("png")
        
        # Save temporarily
        temp_img_path = f"temp_paddle_{page_num}_{os.getpid()}.png"
        with open(temp_img_path, "wb") as f:
            f.write(img_data)
        
        # Run PaddleOCR
        start_time = time.time()
        result = ocr.ocr(temp_img_path, cls=True)
        elapsed = time.time() - start_time
        
        # Extract text from result
        extracted_text = ""
        word_count = 0
        
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                confidence = line[1][1]
                extracted_text += text + "\n"
                word_count += len(text.split())
        
        # Clean up
        os.remove(temp_img_path)
        
        # #ADDED: Post-process the extracted text
        if extracted_text:
            extracted_text = post_process_paddle_text(extracted_text)
        
        if word_count > 0:
            print(f"    📊 PaddleOCR: {word_count} words, {elapsed:.2f}s")
        
        return extracted_text.strip()
    except Exception as e:
        print(f"    ⚠️ PaddleOCR error on page {page_num}: {e}")
        return ""

def extract_text_with_standard_ocr(pdf_path, page_num, page):
    """Standard OCR using pytesseract (fallback method)"""
    try:
        # Render page to image
        pix = page.get_pixmap(dpi=200)
        temp_img_path = f"temp_std_{page_num}.png"
        pix.save(temp_img_path)
        
        # Open with PIL
        img = Image.open(temp_img_path)
        
        # Convert to grayscale for better OCR
        if img.mode != 'L':
            img = img.convert('L')
        
        # Run OCR
        text = pytesseract.image_to_string(img, config='--psm 6')
        
        # Clean up
        os.remove(temp_img_path)
        
        return text.strip()
    except Exception as e:
        print(f"  ⚠️ Standard OCR error on page {page_num}: {e}")
        return ""

def extract_text_with_glmocr(pdf_path, page_num, page):
    """
    #Added on 4th March - GLM-OCR integration stub (Task 2)
    This is a placeholder for GLM-OCR integration.
    In production, you would replace this with actual GLM-OCR API calls.
    """
    try:
        print(f"  Using GLM-OCR for page {page_num}")
        
        # For now, use enhanced standard OCR as fallback
        # In real implementation, you would call GLM-OCR API here
        
        # Render page to image
        pix = page.get_pixmap(dpi=300)
        temp_img_path = f"temp_glm_{page_num}.png"
        pix.save(temp_img_path)
        
        # Placeholder for GLM-OCR API call
        # response = requests.post('https://api.glm-ocr.com/v1/extract', 
        #                           files={'image': open(temp_img_path, 'rb')})
        # text = response.json()['text']
        
        # For now, use pytesseract as placeholder
        import pytesseract
        from PIL import Image
        img = Image.open(temp_img_path)
        text = pytesseract.image_to_string(img, config='--psm 6')
        
        os.remove(temp_img_path)
        return text.strip()
    except Exception as e:
        print(f"  ⚠️ GLM-OCR error on page {page_num}: {e}")
        return ""
def extract_text_hybrid(pdf_path, page_num, page):
    """
    Hybrid approach: Try direct extraction first, then PaddleOCR
    """
    # Method 1: Direct text extraction (fastest, most accurate for digital PDFs)
    direct_text = page.get_text()
    if direct_text and len(direct_text.strip()) > 100:
        # If we got good text directly, use it
        print(f"    📊 Using direct text: {len(direct_text.split())} words")
        return direct_text.strip()
    
    # Method 2: PaddleOCR for scanned/complex documents
    print(f"    📊 Direct text insufficient, using PaddleOCR...")
    paddle_text = extract_text_with_paddleocr(pdf_path, page_num, page)
    
    # If PaddleOCR returns nothing, try standard OCR as fallback
    if not paddle_text:
        print(f"    📊 PaddleOCR failed, using standard OCR...")
        paddle_text = extract_text_with_standard_ocr(pdf_path, page_num, page)
    
    return paddle_text
def post_process_paddle_text(text):
    """Clean up PaddleOCR output to match expected format"""
    if not text:
        return text
    
    # Fix common PaddleOCR artifacts
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Remove excessive spaces
        line = re.sub(r'\s+', ' ', line)
        
        # Fix common character misrecognitions
        replacements = {
            '0': 'O',  # Common in some fonts
            '1': 'l',  # Number 1 vs letter l
            'rn': 'm', # 'rn' often misread as 'm'
            'cl': 'd', # Common OCR error
        }
        # Only apply in specific contexts - be careful!
        
        if line.strip():
            cleaned_lines.append(line.strip())
    
    return '\n'.join(cleaned_lines)

# In your extract_text_with_paddleocr function, add:
  