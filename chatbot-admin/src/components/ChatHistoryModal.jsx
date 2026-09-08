import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function ChatHistoryModal({ sessionId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    api.get(`/leads/${sessionId}`).then(setDetail).catch((e) => setError(e.message));
  }, [sessionId]);

  const name = detail?.session?.name || '(anonymous)';
  const mobile = detail?.session?.mobile_number;

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-header">
          <div>
            <div className="title">{name}</div>
            <div className="sub">{mobile || 'No mobile on file'}</div>
          </div>
          <button className="chat-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="chat-modal-body">
          {error && <div className="error-text">{error}</div>}
          {!detail && !error ? (
            <div className="empty-state">Loading…</div>
          ) : detail?.history?.length ? (
            detail.history.map((m) => {
              const sender = m.response_type === 'bot' ? 'bot' : m.response_type === 'system' ? 'system' : 'user';
              return (
                <div key={m.id} className={`chat-row ${sender}`}>
                  <div className="chat-bubble">{m.message_text}</div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">No messages recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
