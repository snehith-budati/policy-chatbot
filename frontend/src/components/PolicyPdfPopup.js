// #Updated on 5th March - Fixed ESLint warning
import React, { useState, useEffect } from 'react';
import './PolicyPdfPopup.css';

const PolicyPdfPopup = ({ policy, onClose, loading, error }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    useEffect(() => {
        const fetchPdf = async () => {
            if (!policy?.name) {
                setLocalError("No policy selected");
                return;
            }

            setLocalLoading(true);
            setLocalError(null);

            try {
                // Get authentication from session storage
                const username = sessionStorage.getItem('adminUsername') || 'capstoneb2';
                const password = sessionStorage.getItem('adminPassword') || '1234';
                
                // Create Basic Auth token
                const token = btoa(`${username}:${password}`);
                
                // Construct PDF URL
                const pdfUrl = `${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/serve-pdf/${encodeURIComponent(policy.name)}`;
                
                console.log("Fetching PDF from:", pdfUrl);
                
                // Fetch PDF with authentication headers
                const response = await fetch(pdfUrl, {
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

                // Get PDF as blob
                const blob = await response.blob();
                
                if (blob.size === 0) {
                    throw new Error('PDF file is empty');
                }

                // Create local blob URL
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
                console.log("PDF loaded successfully, size:", blob.size, "bytes");
                
            } catch (err) {
                console.error('Error loading PDF:', err);
                setLocalError(err.message);
            } finally {
                setLocalLoading(false);
            }
        };

        fetchPdf();

        // Cleanup function
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [policy?.name]); // Only depend on policy.name, not pdfBlobUrl

    // Handle retry
    const handleRetry = () => {
        setPdfBlobUrl(null);
        setLocalError(null);
        setLocalLoading(true);
    };

    return (
        <div className="pdf-popup-overlay" onClick={onClose}>
            <div className="pdf-popup-container" onClick={(e) => e.stopPropagation()}>
                <div className="pdf-popup-header">
                    <h3>{policy?.name || 'Policy Document'}</h3>
                    <button className="pdf-popup-close" onClick={onClose}>×</button>
                </div>
                
                <div className="pdf-popup-content">
                    {(loading || localLoading) && (
                        <div className="pdf-loading">
                            <div className="spinner"></div>
                            <p>Loading PDF...</p>
                        </div>
                    )}
                    
                    {(error || localError) && (
                        <div className="pdf-error">
                            <p>❌ {error || localError}</p>
                            {localError?.includes('Authentication') && (
                                <p className="error-hint">
                                    Please log in to admin panel first to authenticate.
                                </p>
                            )}
                            <div className="error-actions">
                                <button onClick={handleRetry} className="retry-btn">
                                    Try Again
                                </button>
                                <button onClick={onClose} className="close-btn">
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {pdfBlobUrl && !loading && !localLoading && !error && !localError && (
                        <iframe
                            src={policy?.highlightText ? `${pdfBlobUrl}#page=${(policy.page || 0) + 1}&search=${encodeURIComponent(policy.highlightText)}` : `${pdfBlobUrl}#page=${(policy?.page || 0) + 1}`}
                            title={policy?.name}
                            className="pdf-iframe"
                            width="100%"
                            height="100%"
                            onLoad={() => console.log("PDF iframe loaded")}
                            onError={(e) => {
                                console.error("Iframe error:", e);
                                setLocalError("Failed to display PDF in iframe");
                            }}
                        />
                    )}
                </div>
                
                {/* Footer removed as requested */}
            </div>
        </div>
    );
};

export default PolicyPdfPopup;