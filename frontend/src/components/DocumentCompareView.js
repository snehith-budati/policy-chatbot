import React, { useState, useEffect } from 'react';
import './DocumentCompareView.css';

const DocumentCompareView = ({ document, onClose }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!document?.pdf_url) {
            setError("No PDF URL provided");
            setLoading(false);
            return;
        }

        let isMounted = true;
        let blobUrl = null;

        const fetchPdf = async () => {
            setLoading(true);
            setError(null);

            const username = sessionStorage.getItem('adminUsername') || 'capstoneb2';
            const password = sessionStorage.getItem('adminPassword') || '1234';
            
            const token = btoa(`${username}:${password}`);

            console.log("Fetching PDF from:", document.pdf_url);
            
            try {
                const response = await fetch(document.pdf_url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${token}`,
                        'Accept': 'application/pdf'
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication failed. Please log in again.');
                    } else if (response.status === 404) {
                        throw new Error('PDF file not found.');
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }

                const blob = await response.blob();
                
                if (blob.size === 0) {
                    throw new Error('PDF file is empty');
                }

                blobUrl = URL.createObjectURL(blob);
                
                if (isMounted) {
                    setPdfBlobUrl(blobUrl);
                    console.log("PDF loaded successfully, size:", blob.size, "bytes");
                }
                
            } catch (e) {
                console.error("Failed to fetch PDF:", e);
                if (isMounted) {
                    setError(e.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchPdf();

        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [document?.pdf_url]);

    const handleRetry = () => {
        setPdfBlobUrl(null);
        setError(null);
        setLoading(true);
    };

    return (
        <div className="compare-overlay">
            <div className="compare-container">
                <div className="compare-header">
                    <h2>Document Comparison: {document?.policy_name || 'Unknown'}</h2>
                    <button className="compare-close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="compare-controls">
                    <div className="compare-instructions">
                        <span>Left: Original PDF</span>
                        <span>Right: Extracted Text</span>
                    </div>
                </div>
                
                <div className="compare-panels">
                    <div className="compare-panel left-panel">
                        <div className="panel-header">
                            <h3>Original PDF</h3>
                        </div>
                        <div 
                            className="panel-content"
                        >
                            {loading && (
                                <div className="pdf-loading">
                                    <div className="spinner"></div>
                                    <p>Loading PDF...</p>
                                </div>
                            )}
                            
                            {error && !loading && (
                                <div className="pdf-error">
                                    <p>❌ {error}</p>
                                    <button onClick={handleRetry} className="retry-btn">
                                        Try Again
                                    </button>
                                    {error.includes('Authentication') && (
                                        <p className="error-hint">
                                            Please log out and log back in to refresh your credentials.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {pdfBlobUrl && !error && !loading && (
                                <iframe
                                    src={pdfBlobUrl}
                                    title="Original PDF"
                                    className="pdf-iframe"
                                    width="100%"
                                    height="100%"
                                    onLoad={() => console.log("Iframe loaded")}
                                    onError={(e) => {
                                        console.error("Iframe error:", e);
                                        setError("Failed to display PDF in iframe");
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div className="compare-panel right-panel">
                        <div className="panel-header">
                            <h3>Extracted Text</h3>
                        </div>
                        <div 
                            className="panel-content text-panel"
                        >
                            <pre className="extracted-text">
                                {document?.extracted_text || 'No extracted text available'}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentCompareView;