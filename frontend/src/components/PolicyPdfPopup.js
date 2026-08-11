import React, { useState, useEffect } from 'react';
import './PolicyPdfPopup.css';

const PolicyPdfPopup = ({ policy, onClose, loading, error }) => {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState(null);

    const pdfName = typeof policy === 'string'
        ? policy
        : (policy?.name || policy?.pdf || policy?.filename || '');

    useEffect(() => {
        const fetchPdf = async () => {
            if (!pdfName) {
                setLocalError("No policy selected");
                return;
            }

            setLocalLoading(true);
            setLocalError(null);

            try {
                const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";
                const userEmail = localStorage.getItem("userEmail") || "user@srmap.edu.in";
                
                // Primary: Try public policy view route first
                let pdfUrl = `${apiBase}/policies/${encodeURIComponent(pdfName)}/view?user_email=${encodeURIComponent(userEmail)}`;
                console.log("Fetching PDF from:", pdfUrl);
                
                let response = await fetch(pdfUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/pdf',
                        'X-User-Email': userEmail
                    }
                });

                // Fallback: Try admin serve-pdf route if primary endpoint returns 404 or auth issue
                if (!response.ok) {
                    const username = sessionStorage.getItem('adminUsername') || 'capstoneb2';
                    const password = sessionStorage.getItem('adminPassword') || '1234';
                    const token = btoa(`${username}:${password}`);
                    
                    pdfUrl = `${apiBase}/serve-pdf/${encodeURIComponent(pdfName)}`;
                    response = await fetch(pdfUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Basic ${token}`,
                            'Accept': 'application/pdf'
                        }
                    });
                }

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication failed. Please log in again.');
                    } else if (response.status === 404) {
                        throw new Error(`PDF file "${pdfName}" not found on server.`);
                    } else {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                }

                const blob = await response.blob();
                
                if (blob.size === 0) {
                    throw new Error('PDF file is empty');
                }

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

        return () => {
            setPdfBlobUrl(prevUrl => {
                if (prevUrl) URL.revokeObjectURL(prevUrl);
                return null;
            });
        };
    }, [pdfName]);

    const handleRetry = () => {
        setPdfBlobUrl(null);
        setLocalError(null);
        setLocalLoading(true);
    };

    const targetPage = typeof policy === 'object' && policy !== null && (policy.page !== undefined)
        ? (parseInt(policy.page, 10) + 1)
        : 1;

    return (
        <div className="pdf-popup-overlay" onClick={onClose}>
            <div className="pdf-popup-container" onClick={(e) => e.stopPropagation()}>
                <div className="pdf-popup-header">
                    <h3>{pdfName || 'Policy Document'}</h3>
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
                            src={`${pdfBlobUrl}#page=${targetPage}`}
                            title={pdfName}
                            className="pdf-iframe"
                            width="100%"
                            height="100%"
                            onLoad={() => console.log("PDF iframe loaded successfully")}
                            onError={(e) => {
                                console.error("Iframe error:", e);
                                setLocalError("Failed to display PDF in iframe");
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PolicyPdfPopup;