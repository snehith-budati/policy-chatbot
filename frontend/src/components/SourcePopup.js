import React from 'react';
import './SourcePopup.css';

const SourcePopup = ({ source, onClose, onOpenPdf }) => {
    if (!source) return null;

    return (
        <div className="source-popup-overlay" onClick={onClose}>
            <div className="source-popup-content" onClick={(e) => e.stopPropagation()}>
                <button className="source-popup-close" onClick={onClose}>×</button>
                
                <div className="source-popup-header">
                    <h3>Source Details</h3>
                </div>
                
                <div className="source-popup-body">
                    <div className="source-info-item">
                        <span className="source-info-label">Document:</span>
                        <span className="source-info-value">{source.pdf}</span>
                    </div>
                    
                    <div className="source-info-item">
                        <span className="source-info-label">Page:</span>
                        <span className="source-info-value">{source.page + 1}</span>
                    </div>
                    
                    {source.similarity && (
                        <div className="source-info-item">
                            <span className="source-info-label">Relevance:</span>
                            <span className="source-info-value">
                                <span className="relevance-bar">
                                    <span 
                                        className="relevance-fill" 
                                        style={{ width: `${Math.round(source.similarity * 100)}%` }}
                                    ></span>
                                </span>
                                <span className="relevance-text">{Math.round(source.similarity * 100)}%</span>
                            </span>
                        </div>
                    )}
                    
                    {source.text_snippet && (
                        <div className="source-snippet">
                            <span className="source-info-label">Text Snippet:</span>
                            <div className="snippet-content">
                                "{source.text_snippet}"
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="source-popup-footer" style={{display: 'flex', justifyContent: 'space-between'}}>
                    {onOpenPdf && (
                        <button 
                            className="source-popup-view" 
                            style={{backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'}}
                            onClick={() => onOpenPdf(source)}
                        >
                            Open in PDF
                        </button>
                    )}
                    <button className="source-popup-gotit" onClick={onClose}>Got it</button>
                </div>
            </div>
        </div>
    );
};

export default SourcePopup;