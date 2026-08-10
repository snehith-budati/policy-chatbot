import React, { useState, useRef, useEffect, useCallback } from 'react';
import './PolicyDiffCompare.css';

function tokenize(text) {
  return text.split(/(\s+)/);
}

function computeDiff(oldTokens, newTokens) {
  const m = oldTokens.length;
  const n = newTokens.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldTokens[i] === newTokens[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const result = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldTokens[i] === newTokens[j]) {
      result.push({ type: 'equal', value: oldTokens[i] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'insert', value: newTokens[j] });
      j++;
    } else {
      result.push({ type: 'delete', value: oldTokens[i] });
      i++;
    }
  }
  return result;
}

function diffText(oldText, newText) {
  const oldTokens = tokenize(oldText || '');
  const newTokens = tokenize(newText || '');
  return computeDiff(oldTokens, newTokens);
}

function buildPageDiffs(oldChunks, newChunks) {
  const groupByPage = (arr) => {
    const map = {};
    arr.forEach(c => {
      const p = c.page_number ?? 0;
      if (!map[p]) map[p] = [];
      map[p].push(c.text || '');
    });
    return map;
  };
  const oldByPage = groupByPage(oldChunks);
  const newByPage = groupByPage(newChunks);

  const allPages = new Set([
    ...Object.keys(oldByPage).map(Number),
    ...Object.keys(newByPage).map(Number),
  ]);

  return Array.from(allPages).sort((a, b) => a - b).map(p => {
    const oldText = (oldByPage[p] || []).join('\n');
    const newText = (newByPage[p] || []).join('\n');
    const diff = diffText(oldText, newText);
    const hasDiff = diff.some(d => d.type !== 'equal');
    return { pageNum: p + 1, oldText, newText, diff, hasDiff };
  });
}

function DiffTextPanel({ diff, side, searchPage, isActive, showBbox }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const markRefs = useRef([]);

  useEffect(() => {
    if (isActive && containerRef.current) {
      const highlight = containerRef.current.querySelector('.diff-change');
      if (highlight) highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, searchPage]);

  const drawClusters = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!showBbox) return;

    const marks = markRefs.current.filter(Boolean);
    if (marks.length === 0) return;

    const cRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;

    const rects = marks.map(el => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top - cRect.top + scrollTop,
        left: r.left - cRect.left + scrollLeft,
        bottom: r.bottom - cRect.top + scrollTop,
        right: r.right - cRect.left + scrollLeft,
      };
    }).sort((a, b) => a.top - b.top);

    const GAP_PX = 48;
    const clusters = [];
    rects.forEach(r => {
      const last = clusters[clusters.length - 1];
      if (last && r.top - last.bottom < GAP_PX) {
        last.left = Math.min(last.left, r.left);
        last.right = Math.max(last.right, r.right);
        last.bottom = Math.max(last.bottom, r.bottom);
      } else {
        clusters.push({ top: r.top, left: r.left, bottom: r.bottom, right: r.right });
      }
    });

    const inner = container.querySelector('.panel-scroll-inner') || container;
    svg.setAttribute('width', inner.scrollWidth || cRect.width);
    svg.setAttribute('height', inner.scrollHeight || cRect.height);

    const PAD = 6;
    const color = side === 'old' ? '#ef4444' : '#22c55e';
    const fillColor = side === 'old' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)';
    const label = side === 'old' ? '− removed' : '+ added';

    const drawRect = (svg, x, y, w, h, fill, stroke, dash) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', x); el.setAttribute('y', y);
      el.setAttribute('width', w); el.setAttribute('height', h);
      el.setAttribute('rx', '5'); el.setAttribute('ry', '5');
      if (fill) el.setAttribute('fill', fill);
      if (stroke) { el.setAttribute('fill', 'none'); el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', '2'); el.setAttribute('stroke-dasharray', dash || '6,3'); }
      svg.appendChild(el);
    };

    clusters.forEach((cl, idx) => {
      const x = cl.left - PAD;
      const y = cl.top - PAD;
      const w = (cl.right - cl.left) + PAD * 2;
      const h = (cl.bottom - cl.top) + PAD * 2;

      drawRect(svg, x, y, w, h, fillColor, null, null);
      drawRect(svg, x, y, w, h, null, color, '6,3');

      if (idx === 0) {
        const labelY = Math.max(y - 2, 16);
        const pillW = label.length * 7 + 12;
        const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        pill.setAttribute('x', x); pill.setAttribute('y', labelY - 14);
        pill.setAttribute('width', pillW); pill.setAttribute('height', 16);
        pill.setAttribute('rx', '4'); pill.setAttribute('fill', color);
        svg.appendChild(pill);

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', x + 5); txt.setAttribute('y', labelY - 2);
        txt.setAttribute('font-size', '10'); txt.setAttribute('fill', '#fff');
        txt.setAttribute('font-family', 'monospace'); txt.setAttribute('font-weight', '700');
        txt.textContent = label;
        svg.appendChild(txt);
      }
    });
  }, [side, showBbox]);

  useEffect(() => {
    const id = setTimeout(drawClusters, 30);
    return () => clearTimeout(id);
  }, [diff, side, showBbox, searchPage, drawClusters]);

  const onScroll = useCallback(() => {
    requestAnimationFrame(drawClusters);
  }, [drawClusters]);

  let changeIdx = 0;
  markRefs.current = [];

  return (
    <div className="diff-text-body" ref={containerRef} onScroll={onScroll}>
      <svg
        ref={svgRef}
        className="bbox-svg"
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 10 }}
      />
      <pre className="diff-pre">
        {diff.map((token, i) => {
          if (token.type === 'equal') return <span key={i}>{token.value}</span>;
          if (side === 'old' && token.type === 'delete') {
            const ci = changeIdx++;
            return (
              <mark
                key={i}
                className="diff-delete diff-change"
                ref={el => { markRefs.current[ci] = el; }}
              >{token.value}</mark>
            );
          }
          if (side === 'new' && token.type === 'insert') {
            const ci = changeIdx++;
            return (
              <mark
                key={i}
                className="diff-insert diff-change"
                ref={el => { markRefs.current[ci] = el; }}
              >{token.value}</mark>
            );
          }
          return null;
        })}
      </pre>
    </div>
  );
}

const PolicyDiffCompare = ({ policies, credentials, onClose }) => {
  const [oldPolicy, setOldPolicy] = useState('');
  const [newPolicy, setNewPolicy] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [pageDiffs, setPageDiffs] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBboxOverlay, setShowBboxOverlay] = useState(true);
  const [filterChanged, setFilterChanged] = useState(false);
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  const categories = Array.from(
    new Set(policies.map(p => p.category_name || p.policy_type || 'General'))
  ).sort();

  const handleOldPolicyChange = (name) => {
    setOldPolicy(name);
    if (name) {
      const selected = policies.find(p => p.name === name);
      if (selected) {
        const cat = selected.category_name || selected.policy_type || 'General';
        setSelectedCategoryFilter(cat);
        if (newPolicy) {
          const newObj = policies.find(p => p.name === newPolicy);
          const newCat = newObj ? (newObj.category_name || newObj.policy_type || 'General') : '';
          if (newCat !== cat) setNewPolicy('');
        }
      }
    }
  };

  const handleCategoryFilterChange = (cat) => {
    setSelectedCategoryFilter(cat);
    if (cat) {
      if (oldPolicy) {
        const oldObj = policies.find(p => p.name === oldPolicy);
        const oldCat = oldObj ? (oldObj.category_name || oldObj.policy_type || 'General') : '';
        if (oldCat !== cat) setOldPolicy('');
      }
      if (newPolicy) {
        const newObj = policies.find(p => p.name === newPolicy);
        const newCat = newObj ? (newObj.category_name || newObj.policy_type || 'General') : '';
        if (newCat !== cat) setNewPolicy('');
      }
    }
  };

  const currentCategory = selectedCategoryFilter || (oldPolicy ? (policies.find(p => p.name === oldPolicy)?.category_name || policies.find(p => p.name === oldPolicy)?.policy_type || 'General') : '');

  const oldPolicyOptions = selectedCategoryFilter
    ? policies.filter(p => (p.category_name || p.policy_type || 'General') === selectedCategoryFilter)
    : policies;

  const newPolicyOptions = currentCategory
    ? policies.filter(p => (p.category_name || p.policy_type || 'General') === currentCategory && p.name !== oldPolicy)
    : policies.filter(p => p.name !== oldPolicy);

  const categoryPolicies = currentCategory
    ? policies.filter(p => (p.category_name || p.policy_type || 'General') === currentCategory)
    : [];
  const notEnoughVersions = currentCategory && categoryPolicies.length < 2;

  const oldObj = policies.find(p => p.name === oldPolicy);
  const newObj = policies.find(p => p.name === newPolicy);

  const fetchChunks = async (policyName) => {
    const username = credentials.username || sessionStorage.getItem('adminUsername');
    const password = credentials.password || sessionStorage.getItem('adminPassword');
    const token = btoa(`${username}:${password}`);
    const res = await fetch(
      `${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/policies/${encodeURIComponent(policyName)}/compare`,
      { headers: { Authorization: `Basic ${token}` } }
    );
    if (!res.ok) throw new Error(`Failed to load "${policyName}"`);
    return res.json();
  };

  const handleCompare = async () => {
    if (!oldPolicy || !newPolicy) { setError('Please select both policies.'); return; }
    if (oldPolicy === newPolicy) { setError('Please select two different policy versions.'); return; }
    setError('');
    setLoading(true);
    setPageDiffs([]);
    try {
      const [oldData, newData] = await Promise.all([
        fetchChunks(oldPolicy),
        fetchChunks(newPolicy),
      ]);

      const parseChunks = (text) =>
        text.split(/--- Page (\d+) ---/).reduce((acc, part, i, arr) => {
          if (i % 2 === 1) {
            acc.push({ page_number: parseInt(arr[i]) - 1, text: arr[i + 1]?.trim() || '' });
          }
          return acc;
        }, []);

      const oldChunks = parseChunks(oldData.extracted_text || '');
      const newChunks = parseChunks(newData.extracted_text || '');
      const diffs = buildPageDiffs(oldChunks, newChunks);
      setPageDiffs(diffs);
      setActivePage(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const displayedPages = filterChanged ? pageDiffs.filter(p => p.hasDiff) : pageDiffs;
  const current = displayedPages[activePage];
  const changedCount = pageDiffs.filter(p => p.hasDiff).length;

  return (
    <div className="pdiff-overlay">
      <div className="pdiff-container">

        <div className="pdiff-header">
          <div className="pdiff-header-left">
            <span className="pdiff-icon">🔀</span>
            <h2>Policy Diff Comparison</h2>
            {pageDiffs.length > 0 && (
              <span className={`pdiff-badge ${changedCount > 0 ? 'badge-warn' : 'badge-ok'}`}>
                {changedCount} page{changedCount !== 1 ? 's' : ''} changed
              </span>
            )}
          </div>
          <button className="pdiff-close" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="pdiff-category-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
          <span style={{ fontWeight: '600', color: '#475569' }}>📁 Policy Category:</span>
          <select
            value={selectedCategoryFilter}
            onChange={e => handleCategoryFilterChange(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
          >
            <option value="">All Categories ({policies.length} documents)</option>
            {categories.map(cat => {
              const count = policies.filter(p => (p.category_name || p.policy_type || 'General') === cat).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count} document{count !== 1 ? 's' : ''})
                </option>
              );
            })}
          </select>
          {currentCategory && (
            <span style={{ color: '#0369a1', fontSize: '12px', background: '#e0f2fe', padding: '3px 10px', borderRadius: '12px', fontWeight: '500', marginLeft: 'auto' }}>
              🔒 Restrict comparisons to category: <strong>{currentCategory}</strong>
            </span>
          )}
        </div>

        <div className="pdiff-selector">
          <div className="pdiff-select-group">
            <label>📄 Old Policy (Base Version)</label>
            <select value={oldPolicy} onChange={e => handleOldPolicyChange(e.target.value)} className="pdiff-select old-select">
              <option value="">— select old policy version —</option>
              {oldPolicyOptions.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} [{p.version_name || 'v1.0'}] ({p.category_name || p.policy_type || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div className="pdiff-arrow">→</div>

          <div className="pdiff-select-group">
            <label>📄 New Policy (Updated Version)</label>
            <select value={newPolicy} onChange={e => setNewPolicy(e.target.value)} className="pdiff-select new-select" disabled={!oldPolicy}>
              <option value="">— select updated policy version —</option>
              {newPolicyOptions.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name} [{p.version_name || 'v1.0'}] ({p.category_name || p.policy_type || 'General'})
                </option>
              ))}
            </select>
          </div>

          <button
            className="pdiff-run-btn"
            onClick={handleCompare}
            disabled={loading || !oldPolicy || !newPolicy}
          >
            {loading ? <span className="pdiff-spinner" /> : '🔍'} Compare Updates
          </button>

          <button
            className="pdiff-exit-btn"
            onClick={onClose}
            title="Exit Comparison and return to Chat"
          >
            ✕ Exit
          </button>
        </div>

        {notEnoughVersions && (
          <div style={{ margin: '8px 24px', padding: '8px 14px', background: '#fffbe8', border: '1px solid #ffe58f', borderRadius: '6px', color: '#854d0e', fontSize: '13px' }}>
            ℹ️ Category <strong>"{currentCategory}"</strong> currently has only {categoryPolicies.length} policy uploaded ({categoryPolicies[0]?.name}). Upload updated versions under category <strong>"{currentCategory}"</strong> from Admin to perform policy comparisons.
          </div>
        )}

        {error && <div className="pdiff-error">⚠️ {error}</div>}

        {pageDiffs.length > 0 && (
          <div className="pdiff-controls">
            <div className="pdiff-controls-left">
              <label className="pdiff-toggle">
                <input type="checkbox" checked={showBboxOverlay} onChange={e => setShowBboxOverlay(e.target.checked)} />
                <span>🔲 Bounding Boxes</span>
              </label>
              <label className="pdiff-toggle">
                <input type="checkbox" checked={filterChanged} onChange={e => { setFilterChanged(e.target.checked); setActivePage(0); }} />
                <span>🔴 Changed pages only</span>
              </label>
            </div>

            <div className="pdiff-pager">
              <button
                className="pdiff-page-btn"
                onClick={() => setActivePage(p => Math.max(0, p - 1))}
                disabled={activePage === 0}
              >‹</button>
              <span className="pdiff-page-info">
                Page {current?.pageNum ?? '—'} ({activePage + 1} / {displayedPages.length})
              </span>
              <button
                className="pdiff-page-btn"
                onClick={() => setActivePage(p => Math.min(displayedPages.length - 1, p + 1))}
                disabled={activePage >= displayedPages.length - 1}
              >›</button>
            </div>
          </div>
        )}

        {pageDiffs.length > 0 && current && (
          <div className="pdiff-body">
            <div className="pdiff-pagelist">
              <div className="pagelist-title">Pages</div>
              <div className="pagelist-scroll">
                {displayedPages.map((pg, idx) => (
                  <button
                    key={pg.pageNum}
                    className={`pagelist-item ${idx === activePage ? 'active' : ''} ${pg.hasDiff ? 'has-diff' : ''}`}
                    onClick={() => setActivePage(idx)}
                    title={pg.hasDiff ? 'Contains changes' : 'No changes'}
                  >
                    <span className="pagelist-num">P{pg.pageNum}</span>
                    {pg.hasDiff && <span className="pagelist-dot" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdiff-panels">
              <div className="pdiff-panel old-panel">
                <div className="panel-head old-head">
                  <span className="panel-head-icon">−</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{oldPolicy}</strong>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {oldObj?.version_name || 'v1.0'}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {oldObj?.category_name || oldObj?.policy_type || 'General'}
                    </span>
                  </span>
                  <span className="panel-head-page">Page {current.pageNum}</span>
                </div>
                <div
                  className="panel-scroll"
                  ref={leftRef}
                >
                  <div className="panel-scroll-inner" style={{ position: 'relative' }}>
                    <DiffTextPanel
                      diff={current.diff}
                      side="old"
                      isActive={true}
                      searchPage={current.pageNum}
                      showBbox={showBboxOverlay && current.hasDiff}
                    />
                  </div>
                </div>
              </div>

              <div className="pdiff-divider">
                {current.hasDiff
                  ? <span className="divider-badge changed">CHANGED</span>
                  : <span className="divider-badge same">SAME</span>}
              </div>

              <div className="pdiff-panel new-panel">
                <div className="panel-head new-head">
                  <span className="panel-head-icon">+</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{newPolicy}</strong>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {newObj?.version_name || 'v1.0'}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                      {newObj?.category_name || newObj?.policy_type || 'General'}
                    </span>
                  </span>
                  <span className="panel-head-page">Page {current.pageNum}</span>
                </div>
                <div
                  className="panel-scroll"
                  ref={rightRef}
                >
                  <div className="panel-scroll-inner" style={{ position: 'relative' }}>
                    <DiffTextPanel
                      diff={current.diff}
                      side="new"
                      isActive
                      searchPage={current.pageNum}
                      showBbox={showBboxOverlay && current.hasDiff}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && pageDiffs.length === 0 && !error && (
          <div className="pdiff-empty">
            <div className="pdiff-empty-icon">📂</div>
            <p>Select two policy PDFs above and click <strong>Compare</strong> to see differences highlighted with bounding boxes.</p>
            <div className="pdiff-legend">
              <span className="legend-del">■ Removed text</span>
              <span className="legend-add">■ Added text</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="pdiff-loading">
            <div className="pdiff-spinner large" />
            <p>Analysing policy documents…</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyDiffCompare;
