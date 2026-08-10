import os
import re
import io
import tempfile
import time
import PyPDF2

try:
    from pdf2image import convert_from_path, convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    print("⚠️ pdf2image not installed. Install with: pip install pdf2image")

try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    print("⚠️ Tesseract not fully available")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
    easyocr_reader = None
except ImportError:
    EASYOCR_AVAILABLE = False
    easyocr_reader = None
    print("⚠️ EasyOCR not installed. Optional: pip install easyocr")

try:
    from mlx_vlm import load, generate
    from mlx_vlm.prompt_utils import apply_chat_template
    from mlx_vlm.utils import load_config
    MLX_AVAILABLE = True
    print("✅ MLX-VLM available - GLM-OCR will run fast on Mac")
except ImportError:
    MLX_AVAILABLE = False
    print("⚠️ mlx-vlm not installed. Install with: pip install mlx-vlm")

_glm_ocr_model = None
_glm_ocr_processor = None
_glm_ocr_config = None
GLM_OCR_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'models',
    'GLM-OCR-8bit'
)

def get_glm_ocr():
    global _glm_ocr_model, _glm_ocr_processor, _glm_ocr_config
    
    if _glm_ocr_model is None and MLX_AVAILABLE:
        try:
            print(f"🔄 Loading GLM-OCR model from {GLM_OCR_MODEL_PATH}...")
            _glm_ocr_model, _glm_ocr_processor = load(GLM_OCR_MODEL_PATH)
            _glm_ocr_config = load_config(GLM_OCR_MODEL_PATH)
            print("✅ GLM-OCR model loaded successfully!")
        except Exception as e:
            print(f"⚠️ Failed to load GLM-OCR model: {e}")
            _glm_ocr_model = False
            
    return _glm_ocr_model, _glm_ocr_processor, _glm_ocr_config

def clean_extracted_text(text):
    if not text:
        return ""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    text = re.sub(r' +', ' ', text)
    lines = [line.strip() for line in text.split('\n')]
    text = '\n'.join(lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def convert_pdf_to_images(pdf_source, dpi=200):
    if not PDF2IMAGE_AVAILABLE:
        print("⚠️ pdf2image not available")
        return []
    
    try:
        if isinstance(pdf_source, (bytes, bytearray)):
            images = convert_from_bytes(pdf_source, dpi=dpi)
        else:
            images = convert_from_path(str(pdf_source), dpi=dpi)
            
        print(f"  ✅ Converted {len(images)} pages to images")
        return images
    except Exception as e:
        print(f"  ⚠️ PDF to image conversion failed: {e}")
        return []

def extract_text_with_glmocr_from_image(image, task="Text Recognition:"):
    model, processor, config = get_glm_ocr()
    if model is None or processor is None:
        return ""
    
    try:
        if not isinstance(image, str):
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                image.save(tmp.name)
                tmp_path = tmp.name
        else:
            tmp_path = image

        formatted_prompt = apply_chat_template(
            processor,
            config,
            task,
            num_images=1
        )
        
        result = generate(
            model,
            processor,
            formatted_prompt,
            image=[tmp_path],
            max_tokens=2048,
            temperature=0.0,
            verbose=False
        )
        
        if not isinstance(image, str) and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

        extracted_text = ""
        if hasattr(result, 'text'):
            extracted_text = result.text
        elif isinstance(result, dict) and 'text' in result:
            extracted_text = result['text']
        elif isinstance(result, str):
            extracted_text = result
        else:
            extracted_text = str(result)
        
        return extracted_text.strip()
    except Exception as e:
        print(f"    ⚠️ GLM-OCR error: {e}")
        return ""

def extract_text_with_glmocr(pdf_source):
    print(f"\n  🚀 GLM-OCR: Processing pages...")
    start_time = time.time()
    
    images = convert_pdf_to_images(pdf_source, dpi=200)
    if not images:
        return []
    
    text_by_page = []
    for page_num, image in enumerate(images):
        page_start = time.time()
        text = extract_text_with_glmocr_from_image(image)
        page_time = time.time() - page_start
        
        if text and len(text.strip()) > 10:
            text = clean_extracted_text(text)
            text_by_page.append({
                'page': page_num,
                'text': text,
                'method': 'glm-ocr'
            })
            print(f"  Page {page_num + 1}/{len(images)}: Extracted {len(text.split())} words in {page_time:.1f}s")
    
    total_time = time.time() - start_time
    print(f"  ✅ GLM-OCR completed {len(text_by_page)}/{len(images)} pages in {total_time:.1f}s")
    return text_by_page

def extract_text_hybrid(pdf_source):
    if MLX_AVAILABLE and os.path.exists(GLM_OCR_MODEL_PATH):
        text_by_page = extract_text_with_glmocr(pdf_source)
        if text_by_page:
            return text_by_page
    
    print(f"\n  📖 Fallback: Trying PyPDF2 extraction...")
    text_by_page = []
    try:
        if isinstance(pdf_source, (bytes, bytearray)):
            stream = io.BytesIO(pdf_source)
            pdf_reader = PyPDF2.PdfReader(stream)
        else:
            with open(pdf_source, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
        total_pages = len(pdf_reader.pages)
        for page_num in range(total_pages):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            
            if text and len(text.strip()) > 20:
                text = clean_extracted_text(text)
                text_by_page.append({
                    'page': page_num,
                    'text': text,
                    'method': 'pypdf2'
                })
        
        if text_by_page:
            print(f"  ✅ PyPDF2 extracted {len(text_by_page)}/{total_pages} pages")
            return text_by_page
    except Exception as e:
        print(f"  ⚠️ PyPDF2 extraction failed: {e}")
    
    print(f"\n  📸 Last resort: Trying EasyOCR/Tesseract...")
    images = convert_pdf_to_images(pdf_source, dpi=200)
    if not images:
        return text_by_page
    
    ocr_text_by_page = []
    for page_num, image in enumerate(images):
        best_text = ""
        best_words = 0
        method_used = ""
        
        if TESSERACT_AVAILABLE:
            try:
                text = pytesseract.image_to_string(image, config='--psm 6').strip()
                if text and len(text.split()) > best_words:
                    best_words = len(text.split())
                    best_text = text
                    method_used = "Tesseract"
            except:
                pass
                
        if best_text:
            best_text = clean_extracted_text(best_text)
            ocr_text_by_page.append({
                'page': page_num,
                'text': best_text,
                'method': method_used
            })
    
    return ocr_text_by_page
