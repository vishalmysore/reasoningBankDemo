/**
 * ModelLoaderModal.jsx — Select and load a local WebLLM model (WebGPU, no API key needed)
 */
import React, { useState } from 'react';
import { WEBLLM_MODELS, loadModel, cancelLoad, getModelStatus } from '../../utils/llm.js';
import { clearMemories, clearTrajectories } from '../../memory/memoryStore.js';

export default function SettingsModal({ onClose, onSave }) {
  const { status: currentStatus, modelId: currentModelId } = getModelStatus();
  const defaultModel = currentModelId ?? WEBLLM_MODELS[0].id;

  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [loadStatus,    setLoadStatus]    = useState(currentStatus); // idle|loading|ready|error
  const [progressMsg,   setProgressMsg]   = useState('');
  const [progressPct,   setProgressPct]   = useState(0);
  const [errorMsg,      setErrorMsg]      = useState('');

  const isLoading = loadStatus === 'loading';
  const isReady   = loadStatus === 'ready';

  const handleLoad = async () => {
    setLoadStatus('loading');
    setErrorMsg('');
    setProgressMsg('Checking WebGPU…');
    setProgressPct(0);

    try {
      await loadModel(selectedModel, (evt) => {
        if (evt.type === 'device') {
          setProgressMsg('WebGPU detected. Starting download…');
        } else if (evt.type === 'downloading') {
          setProgressPct(evt.progress ?? 0);
          setProgressMsg(`Downloading… ${evt.progress ?? 0}%`);
        } else if (evt.type === 'phase' && evt.phase === 'compile') {
          setProgressPct(100);
          setProgressMsg(evt.note ?? 'Compiling shaders… (1–5 min on first load, cached after)');
        } else if (evt.type === 'ready') {
          setProgressPct(100);
          setProgressMsg('Model ready!');
          setLoadStatus('ready');
        } else if (evt.type === 'error') {
          setErrorMsg(evt.error);
          setLoadStatus('error');
        }
      });
      setLoadStatus('ready');
      onSave?.();
    } catch (err) {
      setErrorMsg(err.message);
      setLoadStatus('error');
    }
  };

  const handleCancel = () => {
    cancelLoad();
    setLoadStatus('idle');
    setProgressMsg('');
    setProgressPct(0);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={!isLoading ? onClose : undefined}>
      <div className="glass fade-in" style={{
        width: '100%', maxWidth: 500, padding: '28px 28px 24px',
        borderRadius: 'var(--radius-lg)', maxHeight: '92vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>⚡ Local Model</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Runs entirely in your browser via WebGPU — no API key or server needed
            </p>
          </div>
          {!isLoading && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 22, lineHeight: 1,
            }}>✕</button>
          )}
        </div>

        {/* Model selector */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="rb-model-select">Select Model</label>
          <select
            id="rb-model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            disabled={isLoading}
            style={{ marginTop: 6 }}
          >
            {WEBLLM_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
            Model weights are downloaded once and cached in your browser. Requires Chrome 113+ with a GPU.
          </p>
        </div>

        {/* Progress area */}
        {(isLoading || isReady) && (
          <div style={{ marginBottom: 18 }}>
            <div style={{
              height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden', marginBottom: 8,
            }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: isReady ? 'var(--accent-green)' : 'var(--gradient-accent)',
                width: `${progressPct}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: isReady ? 'var(--accent-green)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
              {progressMsg}
            </p>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
            color: 'var(--accent-red)',
          }}>
            ❌ {errorMsg}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {!isLoading && !isReady && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleLoad}>
              ⚡ Load Model
            </button>
          )}
          {isLoading && (
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCancel}>
              ✕ Cancel
            </button>
          )}
          {isReady && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
              ✅ Start Planning
            </button>
          )}
          {!isLoading && <button className="btn btn-ghost" onClick={onClose}>Close</button>}
        </div>

        <div className="divider" />

        {/* Danger Zone */}
        <div style={{ marginTop: 16 }}>
          <label style={{ color: 'var(--accent-red)' }}>⚠️ Danger Zone</label>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{
              width: '100%', color: 'var(--accent-red)', borderColor: 'rgba(248,113,113,0.2)',
              fontSize: 12, padding: '10px',
            }} onClick={async () => {
              if (window.confirm('Delete all stored memories and trajectories? This cannot be undone.')) {
                await clearMemories();
                await clearTrajectories();
                onSave?.();
                onClose();
              }
            }}>
              🗑️ Clear All Local Data
            </button>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
              Clears IndexedDB memories and trajectories stored in this browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
