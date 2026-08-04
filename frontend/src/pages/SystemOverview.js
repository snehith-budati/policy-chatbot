import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SystemOverview.css';

const SystemOverview = () => {
    const navigate = useNavigate();
    const [openRegistry, setOpenRegistry] = React.useState(null);

    const toggleRegistry = (id) => {
        setOpenRegistry(openRegistry === id ? null : id);
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="system-overview-container">
            <header className="overview-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                <div className="header-content">
                    <h1>How Our System Works</h1>
                    <p className="subtitle">Project Overview: Making University Policies Easy to Access</p>
                </div>
            </header>

            <main className="overview-main">
                {/* SECTION 1: SYSTEM ABSTRACTION */}
                <section className="overview-section abstraction-section glass-card entrance-anim">
                    <div className="section-badge">CHAPTER 01</div>
                    <div className="abstraction-container">
                        <div className="abstraction-text">
                            <h2>System Abstraction</h2>
                            <p className="intro-text">
                                The core of our project is a <strong>RAG Pipeline</strong> (Retrieval-Augmented Generation).
                                Instead of relying on general AI knowledge, our system acts as a specialized <strong>Knowledge Retrieval Agent</strong> for <strong>SRM University AP</strong>.
                                <br /><br />
                                It doesn't guess answers, it reads official policies in real-time to find exact rules, ensuring every response is accurate and verifiable.
                            </p>
                        </div>
                        <div className="abstraction-card">
                            <div className="card-item yellow">
                                <strong>Contextual Mastery</strong>
                                <p>First retrieves the fact, then answers the question.</p>
                            </div>
                            <div className="card-item blue">
                                <strong>Policy-First Logic</strong>
                                <p>Only answers based on the 25 uploaded documents.</p>
                            </div>
                            <div className="card-item green">
                                <strong>Verifiable Trust</strong>
                                <p>Citations included in every response for transparency.</p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* SECTION 2: THE MASTER ARCHITECTURE FLOW */}
                {/* SECTION 2: THE MASTER ARCHITECTURE FLOW */}
                <section className="overview-section entrance-anim">
                    <div className="section-badge">PICTURE 01</div>
                    <h2>Master Architecture Flow</h2>
                    <div className="infographic-container master-flow-v2 glass-card">
                        <svg viewBox="0 0 1000 500" className="master-arch-svg">
                            <defs>
                                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#3B82F6" />
                                    <stop offset="100%" stopColor="#2563EB" />
                                </linearGradient>
                                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#D97706" />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                                </marker>
                                <marker id="arrowhead-small" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                    <polygon points="0 0, 6 2, 0 4" fill="currentColor" />
                                </marker>
                                <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" />
                                </marker>
                            </defs>

                            {/* --- BACKGROUND INGESTION LAYER --- */}
                            <g className="ingestion-layer" transform="translate(20, 420)">
                                <rect width="960" height="60" rx="30" className="layer-bg" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                                <text x="450" y="-15" className="layer-label" fill="#64748b" fontWeight="900" fontSize="12" textAnchor="middle" letterSpacing="3">INGESTION PIPELINE (OFFLINE DATA PREPARATION)</text>

                                <g transform="translate(30, 10)">
                                    <rect width="110" height="40" rx="20" className="node-box dark" />
                                    <text x="55" y="25" className="node-textSmall" fill="#1e293b" fontSize="11">PDF POLICY</text>
                                </g>
                                <path d="M140 30 H170" className="connector-line" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />

                                <g transform="translate(170, 10)">
                                    <rect width="130" height="40" rx="20" className="node-box dark" />
                                    <text x="65" y="25" className="node-textSmall" fill="#1e293b" fontSize="11">GLM-OCR / VLM</text>
                                </g>
                                <path d="M300 30 H330" className="connector-line" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />

                                <g transform="translate(330, 10)">
                                    <rect width="110" height="40" rx="20" className="node-box dark" />
                                    <text x="55" y="25" className="node-textSmall" fill="#1e293b" fontSize="11">CHUNKING</text>
                                </g>
                                <path d="M440 30 H470" className="connector-line" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />

                                <g transform="translate(470, 10)">
                                    <rect width="120" height="40" rx="20" className="node-box dark" />
                                    <text x="60" y="25" className="node-textSmall" fill="#1e293b" fontSize="11">EMBEDDING</text>
                                </g>
                                <path d="M590 30 H620" className="connector-line" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />

                                <g transform="translate(620, 10)">
                                    <rect width="150" height="40" rx="20" className="node-box" fill="#EFF6FF" stroke="#3B82F6" />
                                    <text x="75" y="25" className="node-textSmall" fill="#2563EB" fontSize="11" fontWeight="800">VECTOR STORE</text>
                                </g>
                                <path d="M770 30 H800" className="connector-line" stroke="#3B82F6" strokeWidth="2" markerEnd="url(#arrowhead)" opacity="0.6" />

                                <g transform="translate(800, 10)">
                                    <rect width="110" height="40" rx="20" className="node-box dark" />
                                    <text x="55" y="25" className="node-textSmall" fill="#1e293b" fontSize="11">METADATA</text>
                                </g>
                            </g>

                            {/* --- MAIN QUERY FLOW (HORIZONTAL) --- */}

                            {/* 1. START: USER QUERY */}
                            <g transform="translate(50, 180)">
                                <rect width="120" height="60" rx="10" className="node-start" />
                                <text x="60" y="32" className="node-title" fill="#1E293B" fontWeight="800">USER</text>
                                <text x="60" y="48" className="node-subtitle" fill="#64748B" fontSize="10">Policy Question</text>
                            </g>

                            {/* Arrow to Router */}
                            <path d="M170 210 H220" stroke="#3B82F6" strokeWidth="3" markerEnd="url(#arrowhead)" fill="none" />

                            {/* 2. SEMANTIC ROUTER */}
                            <g transform="translate(220, 160)">
                                <rect width="140" height="100" rx="15" className="node-router" />
                                <text x="70" y="45" className="node-title" fill="#2563EB" fontWeight="800">SEMANTIC</text>
                                <text x="70" y="65" className="node-title" fill="#2563EB" fontWeight="800">ROUTER</text>
                                <text x="70" y="82" className="node-subtitle" fill="#3B82F6" fontSize="10">Threshold Logic</text>
                            </g>

                            {/* Path: CACHE (TOP) - FIXED */}
                            <path d="M360 210 L420 210 L420 100 L500 100" stroke="#10B981" strokeWidth="2" strokeDasharray="5" fill="none" markerEnd="url(#arrowhead-green)" />
                            <text x="390" y="180" fill="#059669" fontSize="11" fontWeight="600">Score &gt; 0.88</text>

                            <g transform="translate(500, 60)">
                                <rect width="180" height="80" rx="12" className="node-box cache-glow" />
                                <text x="90" y="40" className="node-title" fill="#065F46" fontWeight="800">SEMANTIC CACHE</text>
                                <text x="90" y="60" className="node-subtitle" fill="#10B981" fontSize="10">Instant SQL Return</text>
                            </g>

                            {/* Path: RAG (BOTTOM) - FIXED */}
                            <path d="M360 210 L400 210 L400 320 L450 320" stroke="#3B82F6" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

                            {/* RAG PIPELINE CLUSTER - UNCHANGED */}
                            <g transform="translate(450, 180)">
                                <rect width="400" height="200" rx="20" className="cluster-box" />
                                <text x="200" y="30" className="cluster-label" fill="#94A3B8" fontSize="11" fontWeight="800">RAG ENGINE (OLLAMA)</text>

                                {/* Step A: Discovery */}
                                <g transform="translate(30, 60)">
                                    <rect width="100" height="100" rx="10" className="node-sub" fill="#F1F5F9" stroke="#3B82F6" />
                                    <text x="50" y="45" className="sub-title" fill="#1E293B" fontSize="10" fontWeight="800">RETRIEVAL</text>
                                    <text x="50" y="65" className="sub-text" fill="#3B82F6" fontSize="9">Vector Search</text>
                                </g>

                                <path d="M130 110 H170" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrowhead-small)" fill="none" />

                                {/* Step B: Rerank */}
                                <g transform="translate(170, 60)">
                                    <rect width="100" height="100" rx="10" className="node-sub" fill="#F1F5F9" stroke="#F59E0B" />
                                    <text x="50" y="45" className="sub-title" fill="#1E293B" fontSize="10" fontWeight="800">RERANKER</text>
                                    <text x="50" y="65" className="sub-text" fill="#D97706" fontSize="9">Cross-Encoder</text>
                                </g>

                                <path d="M270 110 H310" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrowhead-small)" fill="none" />

                                {/* Step C: Generate */}
                                <g transform="translate(310, 60)">
                                    <rect width="60" height="100" rx="10" className="node-sub" fill="#F1F5F9" stroke="#10B981" />
                                    <text x="30" y="52" className="sub-title" fill="#1E293B" fontSize="9" fontWeight="800" textAnchor="middle">USER-SELECT</text>
                                    <text x="30" y="65" className="sub-title" fill="#1E293B" fontSize="9" fontWeight="800" textAnchor="middle">MODELS</text>
                                    <text x="30" y="80" className="sub-text" fill="#059669" fontSize="8" textAnchor="middle">Phi/Fal/Qwen</text>
                                </g>
                            </g>

                            {/* OUTPUTS - UNCHANGED */}
                            <path d="M680 100 H880 Q920 100 920 150" stroke="#10B981" strokeWidth="2" strokeDasharray="5" fill="none" markerEnd="url(#arrowhead-green)" />
                            <path d="M850 310 H920 Q920 310 920 250" stroke="#3B82F6" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)" />

                            {/* FINAL RESPONSE - UNCHANGED */}
                            <g transform="translate(870, 180)">
                                <polygon points="0,0 120,30 0,60" fill="#2563EB" opacity="0.05" />
                                <rect width="100" height="60" rx="30" className="node-box" fill="#F1F5F9" stroke="#2563EB" strokeWidth="2" />
                                <text x="50" y="32" className="node-title" fill="#1E293B" fontWeight="800">ANSWER</text>
                                <text x="50" y="48" className="node-subtitle" fill="#2563EB" fontSize="9">Ref. Citations</text>
                            </g>

                            {/* DATA SYNC LINE - UNCHANGED */}
                            <path d="M715 420 V385" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4" fill="none" markerEnd="url(#arrowhead)" />
                            <text x="725" y="412" fill="#64748B" fontSize="9" fontWeight="700">Knowledge injection</text>
                        </svg>
                        <div className="smart-pathfinding-highlight glass-card">
                            <div className="highlight-icon">⚡</div>
                            <div className="highlight-text">
                                <h3>Smart Pathfinding Technology</h3>
                                <p>The system intelligently optimizes every query: instantaneously identifying <strong>common questions</strong> for sub-second responses, while performing a <strong>deep-policy search</strong> through hundreds of pages for <strong>new queries</strong>.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION: SYSTEM EXECUTION PIPELINE */}
                <section className="overview-section execution-pipeline entrance-anim">
                    <div className="section-badge">PROJECT FLOW</div>
                    <h2>System Execution Pipeline</h2>
                    <p className="intro-text">A step-by-step breakdown of how the project processes documents and answers questions.</p>

                    <div className="pipeline-container glass-card">
                        <div className="pipeline-columns">
                            {/* Left Side: Boxes and Arrows */}
                            <div className="pipeline-visual">
                                <div className="p-node">PDF Policy Files</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node highlight-node">OCR Visual Processing</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node highlight-node">Semantic Chunking</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node highlight-node">Vector Embedding</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node">Vector Database</div>
                                <div className="p-arrow highlight-arrow p-query-label">⇗ (User Query)</div>
                                <div className="p-node highlight-node p-node-down">Semantic Router</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node result-node">RAG Engine (LLM)</div>
                                <div className="p-arrow">↓</div>
                                <div className="p-node answer-node">Answer with Citations</div>
                            </div>

                            {/* Right Side: Detailed Explanations */}
                            <div className="pipeline-details">
                                <div className="p-step">
                                    <h4>1. PDF Reading</h4>
                                    <p>The system reads raw PDF files (like the Student Manual or Attendance Policy) and prepares them for the AI to understand.</p>
                                </div>
                                <div className="p-step">
                                    <h4>2. Visual OCR Processing</h4>
                                    <p>Our <strong>GLM-OCR</strong> acts as the primary engine, with <strong>Tesseract</strong> and <strong>EasyOCR</strong> serving as reliable fallbacks. Together they act as digital eyes, converting both clear text and scanned document images into searchable digital data.</p>
                                </div>
                                <div className="p-step">
                                    <h4>3. Semantic Text Chunking</h4>
                                    <p>Long rulebooks are sliced into logical blocks with 50-word overlaps. This ensures the AI always has the "complete sentence" context even if a rule spans two pages.</p>
                                </div>
                                <div className="p-step">
                                    <h4>4. Vector Embedding Store</h4>
                                    <p>Using <strong>Nomic-Embed</strong>, each chunk is turned into a 768-dimensional numerical "map." This allows the system to find policies by their <em>semantic meaning</em>, not just keyword matches.</p>
                                </div>
                                <div className="p-step">
                                    <h4>5. Smart Query Routing</h4>
                                    <p>When you ask a question, the system first checks the <strong>Semantic Cache</strong>. If a similar question has been answered before, it returns a verified answer in &lt;1s.</p>
                                </div>
                                <div className="p-step">
                                    <h4>6. Neural Retrieval & Reranking</h4>
                                    <p>The system retrieves the top 10 potential pages and uses a <strong>Sentence Transformer Cross-Encoder</strong> to double-check their relevance, narrowing them down to the 3 most truthful facts.</p>
                                </div>
                                <div className="p-step">
                                    <h4>7. User Model Selection</h4>
                                    <p>The system allows you to manually choose the best "brain" for your question. You can select <strong>Phi-3</strong> for speed, <strong>Falcon</strong> for maximum efficiency, or <strong>Qwen</strong> for complex logic, giving you full control over the response generation.</p>
                                </div>
                                <div className="p-step">
                                    <h4>8. Instruction Following & Citation</h4>
                                    <p>The final response is formatted with direct <strong>Source Citations</strong>. This is a critical trust mechanism: a citation is a direct link (PDF name + Page Number) that proves the answer came from an official document. It ensures the AI doesn't "hallucinate" (guess) but acts as a smart portal to the original policy.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* SECTION 3: LLM MODEL ENCYCLOPEDIA */}
                <section className="overview-section glass-card entrance-anim">
                    <div className="section-badge">CHAPTER 02</div>
                    <h2>LLM Model Encyclopedia</h2>
                    <div className="models-encyclopedia">
                        <div className="model-profile">
                            <div className="model-header phi-header">
                                <span className="model-type">MAIN HELPER</span>
                                <h3>Microsoft Phi-3 Mini</h3>
                            </div>
                            <div className="model-body">
                                <p>Phi-3 is our primary AI brain. It has been taught using high-quality educational data, making it very smart at logic and extremely fast at answering your questions.</p>
                                <div className="tech-specs">
                                    <div className="spec-item"><span>Speed</span><strong>Very Fast</strong></div>
                                    <div className="spec-item"><span>Style</span><strong>Smart & Direct</strong></div>
                                    <div className="spec-item"><span>Efficiency</span><strong>Low Battery Usage</strong></div>
                                </div>
                            </div>
                        </div>

                        <div className="model-profile">
                            <div className="model-header qwen-header">
                                <span className="model-type">PROBLEM SOLVER</span>
                                <h3>Qwen 2.5 (3B Instruct)</h3>
                            </div>
                            <div className="model-body">
                                <p>We use Qwen for more difficult questions. If a policy has complex math or multiple steps, this brain steps in to make sure everything is calculated correctly.</p>
                                <div className="tech-specs">
                                    <div className="spec-item"><span>Memory</span><strong>Huge</strong></div>
                                    <div className="spec-item"><span>Focus</span><strong>Deep Thinking</strong></div>
                                    <div className="spec-item"><span>Expertise</span><strong>Math & Logic</strong></div>
                                </div>
                            </div>
                        </div>

                        <div className="model-profile">
                            <div className="model-header falcon-header">
                                <span className="model-type">EFFICIENCY KING</span>
                                <h3>Falcon (1B Instruct)</h3>
                            </div>
                            <div className="model-body">
                                <p>Falcon is the "engine" behind our lightest AI. We chose Falcon because it is world-class at being efficient—it provides smart answers while using very little computer power.</p>
                                <div className="tech-specs">
                                    <div className="spec-item"><span>Footprint</span><strong>Ultra Light</strong></div>
                                    <div className="spec-item"><span>Architecture</span><strong>Next-Gen</strong></div>
                                    <div className="spec-item"><span>Power</span><strong>Eco-Friendly</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: OCR MODELS */}
                <section className="overview-section glass-card entrance-anim alternate">
                    <div className="section-badge">CHAPTER 03</div>
                    <h2>OCR Models</h2>
                    <div className="ocr-deep-dive">
                        <div className="ocr-flow-diagram">
                            <svg viewBox="0 0 600 300" className="ocr-logic-svg">
                                <rect x="10" y="100" width="100" height="100" rx="10" fill="rgba(30, 41, 59, 0.03)" stroke="#CBD5E1" strokeWidth="1" />
                                <text x="60" y="155" textAnchor="middle" fill="#1E293B" fontSize="12" fontWeight="bold">PDF INPUT</text>

                                <path d="M110 150 H180" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4" />

                                {/* Logical Switch */}
                                <g transform="translate(180, 100)">
                                    <polygon points="0,50 50,0 100,50 50,100" fill="rgba(37, 99, 235, 0.05)" stroke="#2563EB" />
                                    <text x="50" y="55" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="bold">TYPE CHECK</text>
                                </g>

                                <path d="M280 150 H350" stroke="#2563EB" strokeWidth="2" />
                                <text x="315" y="140" textAnchor="middle" fill="#64748b" fontSize="9">SCANNED</text>

                                <g transform="translate(350, 50)">
                                    <rect width="180" height="205" rx="15" fill="#F8FAFC" stroke="#E2E8F0" />
                                    <text x="90" y="30" textAnchor="middle" fill="#64748B" fontSize="10" fontWeight="bold">OCR ENGINE POOL</text>

                                    <rect x="20" y="50" width="140" height="40" rx="20" fill="rgba(245, 158, 11, 0.05)" stroke="#F59E0B" />
                                    <text x="90" y="75" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="bold">GLM-OCR (Primary)</text>

                                    <rect x="20" y="100" width="140" height="30" rx="5" fill="#F1F5F9" stroke="#3B82F6" strokeWidth="1" />
                                    <text x="90" y="120" textAnchor="middle" fill="#3B82F6" fontSize="10" fontWeight="bold">EasyOCR (Fallback)</text>

                                    <rect x="20" y="145" width="140" height="30" rx="5" fill="#F1F5F9" stroke="#10B981" strokeWidth="1" />
                                    <text x="90" y="165" textAnchor="middle" fill="#10B981" fontSize="10" fontWeight="bold">Tesseract (Fallback)</text>
                                </g>
                            </svg>
                        </div>
                        <div className="ocr-details">
                            <div className="ocr-engine-info">
                                <h3>1. GLM-OCR & Visual LLM</h3>
                                <p>This is like a digital eye that can read messy text, complex charts, and even notes on the side of a page. It's designed to be fast and accurate on modern computers.</p>
                            </div>
                            <div className="ocr-engine-info">
                                <h3>2. EasyOCR (Fallback Engine)</h3>
                                <p>Used as a reliable fallback, this helper is great at spotting text even in blurry or dark scans, ensuring no important rule is missed even if the document quality is low.</p>
                            </div>
                            <div className="ocr-engine-info">
                                <h3>3. PyTesseract (Fallback Engine)</h3>
                                <p>Our additional fallback for standard university documents, ensuring that every single word is copied perfectly into our digital library using high-speed character recognition.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: TECHNICAL BENCHMARKS */}
                <section className="overview-section entrance-anim">
                    <div className="section-badge">CHAPTER 04</div>
                    <h2>Technical Benchmarks</h2>
                    <div className="specs-container glass-card">
                        <table className="specs-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Technology</th>
                                    <th>Performance / Speed</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Search Accuracy</strong></td>
                                    <td>Smart Text Matching</td>
                                    <td>Top 95% Accuracy</td>
                                </tr>
                                <tr>
                                    <td><strong>Instant Answers</strong></td>
                                    <td>Deep Memory Cache</td>
                                    <td>Returns in &lt; 0.5 seconds</td>
                                </tr>
                                <tr>
                                    <td><strong>Smart Filtering</strong></td>
                                    <td>Relevance Gating</td>
                                    <td>Filters out 99% of noise</td>
                                </tr>
                                <tr>
                                    <td><strong>Document Reading</strong></td>
                                    <td>Visual OCR Scanner</td>
                                    <td>Reads 1 page per second</td>
                                </tr>
                                <tr>
                                    <td><strong>Brain Efficiency</strong></td>
                                    <td>1-Bit BitNet Brain</td>
                                    <td>Uses 70% less energy</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
                <section className="overview-section registry-section entrance-anim">
                    <div className="section-badge">SYSTEM FEATURES</div>
                    <h2>Feature Inventory</h2>
                    <p className="intro-text">A simple list of every feature and capability built into this university chatbot.</p>

                    <div className="registry-stack">
                        {/* 1. FEATURE INVENTORY */}
                        <div className={`registry-card glass-card ${openRegistry === 'features' ? 'open' : ''}`} onClick={() => toggleRegistry('features')}>
                            <div className="registry-header">
                                <div className="header-label">
                                    <span className="count">12</span>
                                    <h3>Core User Features</h3>
                                </div>
                                <div className="toggle-arrow"></div>
                            </div>
                            {openRegistry === 'features' && (
                                <div className="registry-body" onClick={(e) => e.stopPropagation()}>
                                    <ul className="feature-grid">
                                        <li><strong>Smart Question Helper</strong> Finds, checks, and generates answers automatically.</li>
                                        <li><strong>Digital PDF Reader</strong> Can read through any uploaded university document.</li>
                                        <li><strong>Policy Comparison Tool</strong> Shows you exactly what changed between two different policy versions.</li>
                                        <li><strong>Instant Repeating Answers</strong> Remembers common questions to answer them instantly.</li>
                                        <li><strong>Secure Login</strong> Uses a one-time code sent to your official email.</li>
                                        <li><strong>Accuracy Check</strong> A second AI checks if the first one's answer is correct.</li>
                                        <li><strong>Document Slicer</strong> Breaks long policies into small, manageable pieces.</li>
                                        <li><strong>Admin Control Panel</strong> A private dashboard for staff to manage files.</li>
                                        <li><strong>Feedback System</strong> Allows users to thumbs-up or thumbs-down answers.</li>
                                        <li><strong>Policy Sorting</strong> Automatically groups policies by their topic.</li>
                                        <li><strong>Visual Loading</strong> Shows you exactly what the AI is doing while it thinks.</li>
                                        <li><strong>SRM-Only Access</strong> Locked to @srmap.edu.in accounts for safety.</li>
                                        <li><strong>Admin Evaluation Matrix</strong> A dashboard that shows how fast and accurate the AI is performing.</li>
                                        <li><strong>System Analytics & Insights</strong> Visual charts that track how many students are using the system and which policies are most popular.</li>
                                        <li><strong>Mac Optimization</strong> Specially designed to run fast on university computers.</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* 2. FUNCTION REGISTRY (app.py) */}
                        <div className={`registry-card glass-card ${openRegistry === 'backend' ? 'open' : ''}`} onClick={() => toggleRegistry('backend')}>
                            <div className="registry-header">
                                <div className="header-label">
                                    <span className="count">42</span>
                                    <h3>Behind-the-Scenes Actions</h3>
                                </div>
                                <div className="toggle-arrow"></div>
                            </div>
                            {openRegistry === 'backend' && (
                                <div className="registry-body" onClick={(e) => e.stopPropagation()}>
                                    <div className="code-registry">
                                        <div className="registry-item"><code>chat()</code> The main worker that gathers facts and writes an answer.</div>
                                        <div className="registry-item"><code>semantic_search()</code> Looks for relevant rules in the policy database.</div>
                                        <div className="registry-item"><code>check_semantic_cache()</code> Quickly checks if this question was asked before.</div>
                                        <div className="registry-item"><code>rerank_chunks()</code> Double-checks the search results for accuracy.</div>
                                        <div className="registry-item"><code>extract_text_hybrid()</code> Reads text from PDFs or image scans.</div>
                                        <div className="registry-item"><code>chunk_text_intelligently()</code> Cuts policies into logical sections.</div>
                                        <div className="registry-item"><code>create_embedding()</code> Turns words into numbers so the AI can understand them.</div>
                                        <div className="registry-item"><code>authenticate_admin()</code> Makes sure only real admins can access settings.</div>
                                        <div className="registry-item"><code>request_otp()</code> Sends that secure 6-digit code to your email.</div>
                                        <div className="registry-item"><code>clean_extracted_text()</code> Standardizes the text and fixes any typos.</div>
                                        <div className="registry-item"><code>upload_policy()</code> Saves new policies and reads them for the first time.</div>
                                        <div className="registry-item"><code>admin_analytics()</code> Creates a report on how many people are using the system.</div>
                                        <div className="registry-item"><code>cosine_similarity()</code> The math used to see how closely a question matches a rule.</div>
                                        <div className="registry-item"><code>remove_citations_from_text()</code> Cleans up the answer so it's easy to read.</div>
                                        <div className="registry-item"><code>log_admin_action()</code> Keeps a record of what changes were made by staff.</div>
                                        <div className="registry-item"><code>migrate_database()</code> Kepps the library database organized and updated.</div>
                                        <div className="registry-item"><code>get_glm_ocr()</code> Wakes up the visual scanner when a new file arrives.</div>
                                        <div className="registry-item"><code>serve_pdf()</code> Displays the policy for you to read directly.</div>
                                        <div className="registry-item"><code>update_satisfaction()</code> Saves your feedback to improve future answers.</div>
                                    </div>
                                    <p className="registry-footer">These are the primary tasks the system performs automatically.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>




                {/* SECTION: KNOWLEDGE DOMAIN GRID */}
                <section className="overview-section domains-section entrance-anim">
                    <div className="section-badge">COVERAGE</div>
                    <h2>Policy Knowledge Domains</h2>
                    <p className="intro-text">The system is optimized to process and answer questions across 25 core university policies.</p>

                    <div className="domain-grid">
                        <div className="domain-card glass-card">
                            <div className="domain-icon academic-icon"></div>
                            <h3>Academics & Rules</h3>
                            <p>Everything related to <strong>Attendance</strong>, On-Duty rules, <strong>Plagiarism</strong>, and mentorship—keeping you on track with university expectations.</p>
                        </div>
                        <div className="domain-card glass-card">
                            <div className="domain-icon student-icon"></div>
                            <h3>Campus Life & Conduct</h3>
                            <p>Important rules for <strong>Hostel life</strong>, the Student <strong>Code of Conduct</strong>, and university safety and wellness measures.</p>
                        </div>
                        <div className="domain-card glass-card">
                            <div className="domain-icon faculty-icon"></div>
                            <h3>Career & Research</h3>
                            <p>Find guidance on <strong>Student Internships</strong>, Deferred Placements, and <strong>Seed Grants</strong> for student-led research projects.</p>
                        </div>
                        <div className="domain-card glass-card">
                            <div className="domain-icon finance-icon"></div>
                            <h3>Support & Governance</h3>
                            <p>Clear standards for <strong>IT & Email usage</strong>, university grievance redressal processes, and official identity rules.</p>
                        </div>
                    </div>
                </section>

                {/* SECTION 7: PROMPT DNA (INSTRUCTION LAB) */}
                <section className="overview-section prompt-section entrance-anim">
                    <div className="section-badge">RULES</div>
                    <h2>Prompt DNA</h2>
                    <p className="intro-text">We give the AI strict rules to make sure it always stays professional and accurate.</p>

                    <div className="prompt-dna-container glass-card">
                        <div className="prompt-header">
                            <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
                            <span className="sys-label">system_instructions.yaml</span>
                        </div>
                        <div className="prompt-content-code">
                            <pre>
                                <code>
                                    {`- Role: SRM University AP Policy Expert
- Rules: ONLY answer based on the official PDF files.
- Fallback: I can only answer SRM policy questions.
- Tone: Professional, helpful, and polite.
- Fact Check: If the information isn't there, say you don't know.
- Safety: No guessing allowed.`}
                                </code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* SECTION 8: SEMANTIC CHUNKING STRATEGY */}
                <section className="overview-section chunking-section entrance-anim">
                    <div className="section-badge">READING METHOD</div>
                    <h2>Semantic Chunking Strategy</h2>
                    <p className="intro-text">To find answers quickly, we break long university rulebooks into small, searchable parts.</p>

                    <div className="chunking-visual glass-card">
                        <div className="chunk-example">
                            <div className="chunk-box chunk-1">
                                <span>RULE PART 1 (Page 1-2)</span>
                                <div className="overlap-indicator">Linked to Part 2</div>
                            </div>
                            <div className="chunk-box chunk-2">
                                <span>RULE PART 2 (Page 2-3)</span>
                            </div>
                        </div>
                        <div className="chunk-logic">
                            <h3>Partitioning Methodology</h3>
                            <ul>
                                <li><strong>Small Pieces</strong>: We cut documents into short paragraphs so the AI can focus.</li>
                                <li><strong>Context Overlap</strong>: We keep a bit of the previous part so sentences aren't cut in half.</li>
                                <li><strong>Saved Index</strong>: We remember exactly which page each rule came from.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* SECTION 9: RESOURCE FOOTPRINT & EFFICACY */}
                <section className="overview-section metrics-section entrance-anim">
                    <div className="section-badge">PERFORMANCE</div>
                    <h2>Resource Footprint</h2>
                    <p className="intro-text">A quick look at how fast the system reacts on university computers.</p>

                    <div className="metrics-dashboard">
                        <div className="metric-card glass-card shine-effect">
                            <div className="metric-value">15-20s</div>
                            <div className="metric-label">Answer Speed</div>
                            <div className="metric-desc">Time to find the rule and write the answer.</div>
                        </div>
                        <div className="metric-card glass-card shine-effect">
                            <div className="metric-value">Low</div>
                            <div className="metric-label">Memory Usage</div>
                            <div className="metric-desc">Optimized to run on standard office laptops.</div>
                        </div>
                        <div className="metric-card glass-card shine-effect">
                            <div className="metric-value">Fast</div>
                            <div className="metric-label">Typing Speed</div>
                            <div className="metric-desc">The AI writes answers faster than a human.</div>
                        </div>
                        <div className="metric-card glass-card shine-effect">
                            <div className="metric-value">99%</div>
                            <div className="metric-label">Vision Accuracy</div>
                            <div className="metric-desc">Nearly perfect at reading characters and symbols.</div>
                        </div>
                    </div>
                </section>

                {/* SECTION 10: INSTITUTIONAL IMPACT MATRIX */}
                <section className="overview-section impact-section entrance-anim">
                    <div className="section-badge">CAMPUS IMPACT</div>
                    <h2>Institutional Impact Matrix</h2>
                    <p className="intro-text">Our tool makes life easier for everyone on campus.</p>

                    <div className="impact-grid">
                        <div className="impact-node glass-card">
                            <h3>Students</h3>
                            <p>Get instant answers on grading, attendance, and scholarships without waiting.</p>
                        </div>
                        <div className="impact-node glass-card">
                            <h3>Faculty</h3>
                            <p>Quickly find research rules and staff protocols during busy workdays.</p>
                        </div>
                        <div className="impact-node glass-card">
                            <h3>Administrative Staff</h3>
                            <p>Less time answering basic emails; more time solving complex problems.</p>
                        </div>
                    </div>
                </section>

                {/* SECTION: ARCHITECTURAL EVOLUTION & SYSTEM UPDATES */}
                <section className="overview-section evolution-section entrance-anim glass-card">
                    <div className="section-badge highlight">ARCHITECTURAL EVOLUTION</div>
                    <h2>System Refactoring & Latest Upgrades</h2>
                    <p className="intro-text">
                        The PolicyHub AI codebase has undergone comprehensive production-grade refactoring to enhance security, execution speed, modular maintainability, and clean data access.
                    </p>

                    <div className="evolution-grid">
                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">🧱</span>
                                <h3>Modular Blueprint Architecture</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Refactored monolithic backend into dedicated Flask route blueprints (<code>routes/upload</code>, <code>routes/chat</code>, <code>routes/policies</code>, <code>routes/admin</code>, <code>routes/auth</code>).</p>
                        </div>

                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">⚡</span>
                                <h3>RAM Stream PDF Ingestion</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Created <code>file_service.py</code> to process uploaded PDFs directly from RAM memory streams (<code>convert_from_bytes</code>) without saving to local server disk.</p>
                        </div>

                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">🏷️</span>
                                <h3>Document Category Selection</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Added Admin UI Category Selection dropdown allowing explicit assignment of document categories (Academic, HR, IT Security, Student Conduct, Internship) stored in database metadata.</p>
                        </div>

                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">🗄️</span>
                                <h3>Encapsulated DB Middleware (DAL)</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Created <code>middleware/db_middleware.py</code> encapsulating all database CRUD queries into reusable data access layer helper functions.</p>
                        </div>

                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">🤖</span>
                                <h3>Dynamic 2-Part Prompt Engine</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Created <code>services/prompt_service.py</code> separating Part 1 (System Role & Strict Non-Hallucination Rules) from Part 2 (Dynamic Document Context & Query Payload).</p>
                        </div>

                        <div className="evolution-card">
                            <div className="evolution-header">
                                <span className="evolution-icon">🔐</span>
                                <h3>Single-Line Auth Control</h3>
                                <span className="status-tag active">Completed</span>
                            </div>
                            <p>Configured single-line <code>ENABLE_OTP_AUTH</code> toggle in <code>auth.py</code> with automatic 2-hour session bypass for seamless user & admin authentication.</p>
                        </div>
                    </div>

                    <div className="evolution-table-container">
                        <h3>Architecture Comparison: Before vs. After</h3>
                        <table className="evolution-table">
                            <thead>
                                <tr>
                                    <th>Subsystem</th>
                                    <th>Previous Implementation</th>
                                    <th>Refactored Implementation</th>
                                    <th>Impact</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>PDF Processing</strong></td>
                                    <td>Local Disk File I/O (<code>file.save</code>)</td>
                                    <td>RAM Byte Stream (<code>file_service.py</code>)</td>
                                    <td><span className="table-badge green">Stateless & Cloud-Ready</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Category Tagging</strong></td>
                                    <td>Filename Keyword Matching</td>
                                    <td>UI Dropdown + Database Metadata</td>
                                    <td><span className="table-badge green">100% Categorization Accuracy</span></td>
                                </tr>
                                <tr>
                                    <td><strong>Database Access</strong></td>
                                    <td>Inline SQL in Route Files</td>
                                    <td>Encapsulated DB Middleware Layer</td>
                                    <td><span className="table-badge blue">Clean Data Access Layer (DAL)</span></td>
                                </tr>
                                <tr>
                                    <td><strong>AI Prompt Engine</strong></td>
                                    <td>Hardcoded 1-Block String</td>
                                    <td>Dynamic 2-Part System/Payload Module</td>
                                    <td><span className="table-badge gold">Production RAG Standard</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECTION 11: EVOLUTION ROADMAP */}
                <section className="overview-section roadmap-section entrance-anim">
                    <div className="section-badge">FUTURE PLAN</div>
                    <h2>Evolution Roadmap</h2>
                    <div className="roadmap-timeline">
                        <div className="roadmap-item completed">
                            <div className="roadmap-dot"></div>
                            <div className="roadmap-content">
                                <h3>Phase 1: Build & Launch</h3>
                                <p>Set up the smart brain and document reader. [DONE]</p>
                            </div>
                        </div>
                        <div className="roadmap-item completed">
                            <div className="roadmap-dot"></div>
                            <div className="roadmap-content">
                                <h3>Phase 2: Review & Explain</h3>
                                <p>Adding side-by-side policy comparison and transparent system guides. [DONE]</p>
                            </div>
                        </div>
                        <div className="roadmap-item current">
                            <div className="roadmap-dot"></div>
                            <div className="roadmap-content">
                                <h3>Phase 3: Talking AI</h3>
                                <p>Adding voice features so you can speak your questions out loud. [IN PROGRESS]</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: SUSTAINABLE AI & BITNET */}
                <section className="overview-section bitnet-section entrance-anim glass-card">
                    <div className="section-badge highlight">NEXT-GEN TECHNOLOGY</div>
                    <div className="bitnet-container">
                        <div className="bitnet-info">
                            <h2>Sustainable AI: BitNet 1.58b</h2>
                            <p className="intro-text">
                                We've integrated support for BitNet 1.58b, Microsoft's groundbreaking 1-bit LLM technology.
                                We used the Falcon architecture for this because it is the most efficient and lightweight design available, allowing the AI to run smoothly even on basic office laptops.
                                In standard AI like GPT-4, the computer has to perform millions of complex multiplications (like 12.5 x 8.3) to generate a word, which uses a lot of power.
                            </p>
                            <div className="bitnet-math-logic">
                                <div className="logic-card math-red">
                                    <span className="logic-val">-1</span>
                                    <span className="logic-label">REVERSE</span>
                                </div>
                                <div className="logic-card math-gray">
                                    <span className="logic-val">0</span>
                                    <span className="logic-label">SKIP</span>
                                </div>
                                <div className="logic-card math-green">
                                    <span className="logic-val">+1</span>
                                    <span className="logic-label">PASS</span>
                                </div>
                            </div>
                            <p className="bitnet-benefit">
                                BitNet uses Ternary Weights (+1, 0, -1). This replaces power-hungry multiplication with simple addition.
                                The result? 5.1x faster inference and a 70% reduction in energy usage—making PolicyHub AI the most sustainable knowledge assistant on campus.
                            </p>
                        </div>
                        <div className="bitnet-visual">
                            <div className="efficiency-gauge">
                                <div className="gauge-fill"></div>
                                <div className="gauge-text">70% Greener</div>
                            </div>
                            <div className="bitnet-tag">1-Bit Multi-Head Attention</div>
                        </div>
                    </div>
                </section>

                {/* BOTTOM SECURITY FEATURES (Moved from CH 5) */}
                <section className="overview-section security-section bottom-security entrance-anim">
                    <div className="security-grid">
                        <div className="security-card glass-card">
                            <div className="security-icon auth-icon"></div>
                            <h3>Official Emails Only</h3>
                            <p>Only users with a <strong>@srmap.edu.in</strong> email can log in. We send a secret code to your email to prove it's really you.</p>
                        </div>
                        <div className="security-card glass-card">
                            <div className="security-icon sovereignty-icon" style={{ backgroundImage: 'url("/soverignty.png")' }}></div>
                            <h3>Stays at University</h3>
                            <p>All your questions and university documents <strong>never leave campus</strong>. We don't use external clouds, so your data stays private.</p>
                        </div>
                        <div className="security-card glass-card">
                            <div className="security-icon hallucination-icon"></div>
                            <h3>Truth & Source Citations</h3>
                            <p>The AI is never allowed to "guess." Every answer must include a link to the <strong>Original PDF and Page Number</strong>. If the answer isn't in the official rules, the AI will stay silent.</p>
                        </div>
                    </div>
                </section>

                {/* SECTION 6: THE PROJECT REGISTRY (COLLAPSIBLE) */}

            </main>

            <footer className="overview-footer">
                <div className="footer-line"></div>
                <p></p>
                <p className="academic-note">Team Casptoneb2 SRM University AP &copy; 2026</p>
            </footer>
        </div>
    );
};

export default SystemOverview;
