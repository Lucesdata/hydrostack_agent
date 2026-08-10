// src/components/assistants/AssistantChat.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { AssistantContextSlug, AssistantDocumentConfig } from '@/src/lib/assistants/config';

interface AssistantChatProps {
  contextSlug: AssistantContextSlug;
  titulo: string;
  mensajeBienvenida: string;
  documentoConfig?: AssistantDocumentConfig;
  initialMessages: UIMessage[];
}

type UploadStatus = 'idle' | 'uploading' | 'error';

export default function AssistantChat({
  contextSlug,
  titulo,
  mensajeBienvenida,
  documentoConfig,
  initialMessages,
}: AssistantChatProps) {
  const [input, setInput] = useState('');
  const [documentId, setDocumentId] = useState<string | undefined>(undefined);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/assistant',
      body: () => ({ context: contextSlug, documentId }),
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleUpload(file: File) {
    if (!documentoConfig) return;
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', contextSlug);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const responseBody = await res.json();
      if (!res.ok) {
        setUploadError(responseBody.error || `Error ${res.status}`);
        setUploadStatus('error');
        return;
      }
      setDocumentId(responseBody.documentId);
      setDocumentName(file.name);
      setUploadStatus('idle');
      if (documentoConfig.mensajePosSubida) {
        sendMessage({ text: documentoConfig.mensajePosSubida });
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
      setUploadStatus('error');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="asc-wrap">
      <header className="asc-header">
        <span className="asc-tag">[ {titulo} ]</span>
        {documentoConfig && (
          <label className="asc-upload">
            <input
              type="file"
              accept={documentoConfig.accept}
              disabled={uploadStatus === 'uploading'}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
            <span>
              {uploadStatus === 'uploading'
                ? 'Subiendo…'
                : documentName
                  ? `Documento: ${documentName}`
                  : `[ Subir ${documentoConfig.label} ]`}
            </span>
          </label>
        )}
      </header>

      {uploadError && <div className="asc-error">{uploadError}</div>}

      <div className="asc-messages">
        {messages.length === 0 && <div className="asc-welcome">{mensajeBienvenida}</div>}
        {messages.map((m) => (
          <div key={m.id} className={`asc-bubble asc-bubble-${m.role}`}>
            <span className="asc-role">{m.role === 'user' ? 'TÚ' : 'ASISTENTE'}</span>
            <div className="asc-text">
              {m.parts.map((part, i) => (part.type === 'text' ? <span key={`${m.id}-${i}`}>{part.text}</span> : null))}
            </div>
          </div>
        ))}
        {isBusy && <div className="asc-bubble asc-bubble-assistant asc-pending">[ ... ]</div>}
        {error && <div className="asc-error">{error.message}</div>}
        <div ref={bottomRef} />
      </div>

      <form className="asc-input-row" onSubmit={handleSubmit}>
        <input
          className="asc-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={isBusy}
        />
        <button className="asc-send" type="submit" disabled={isBusy || !input.trim()}>
          [ Enviar ]
        </button>
      </form>

      <style jsx>{`
        .asc-wrap {
          display: flex;
          flex-direction: column;
          height: 70vh;
          max-height: 720px;
          border: 1px solid var(--line, #dadad2);
          background: var(--surface, #fff);
          border-radius: var(--radius-lg, 14px);
          overflow: hidden;
        }
        .asc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px dashed var(--line, #dadad2);
        }
        .asc-tag {
          font: 600 11px var(--font-mono, monospace);
          letter-spacing: 0.06em;
          color: var(--accent, #0369a1);
          text-transform: uppercase;
        }
        .asc-upload {
          cursor: pointer;
          font: 600 11px var(--font-mono, monospace);
          color: var(--ink-600, #525b5a);
        }
        .asc-upload input {
          display: none;
        }
        .asc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .asc-welcome {
          font-size: 13px;
          color: var(--ink-300, #6b746f);
          font-family: var(--font-mono, monospace);
        }
        .asc-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border: 1px solid var(--line, #dadad2);
          border-radius: 4px;
        }
        .asc-bubble-user {
          align-self: flex-end;
          background: var(--ink-900, #0a1f1c);
          color: #fff;
          border-color: var(--ink-900, #0a1f1c);
        }
        .asc-bubble-assistant {
          align-self: flex-start;
          background: var(--surface-alt, #f7f7f2);
        }
        .asc-role {
          display: block;
          font: 700 9px var(--font-mono, monospace);
          letter-spacing: 0.08em;
          opacity: 0.6;
          margin-bottom: 4px;
        }
        .asc-text {
          font-size: 13.5px;
          line-height: 1.55;
          white-space: pre-wrap;
        }
        .asc-pending {
          font-family: var(--font-mono, monospace);
          color: var(--ink-300, #6b746f);
        }
        .asc-error {
          margin: 0 16px;
          padding: 10px 12px;
          border: 1px solid var(--danger, #dc2626);
          color: var(--danger, #dc2626);
          font-size: 12.5px;
          border-radius: 6px;
        }
        .asc-input-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px dashed var(--line, #dadad2);
        }
        .asc-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--line, #dadad2);
          border-radius: 8px;
          font-size: 13.5px;
          font-family: var(--font-sans);
        }
        .asc-send {
          font: 600 12px var(--font-mono, monospace);
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: var(--accent, #0369a1);
          color: #fff;
          cursor: pointer;
        }
        .asc-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
