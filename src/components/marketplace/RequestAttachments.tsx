'use client';

// RFQ request attachments (Slice R5) — buyers attach spec sheets, drawings,
// POs, and photos to a request; vendors see/download them read-only for any
// request they legitimately see (same authz as the request itself — this
// component never fetches on its own, it only renders whatever the parent's
// own request/lead payload already carries).
//
// Two exports, kept in ONE small file per the "small mount points, real
// logic in new components" coordination note:
//   - RequestAttachmentsList — read-only rendering (vendor leads; also used
//     internally by the upload variant below).
//   - RequestAttachmentUpload — buyer-only: adds a file input + client-side
//     validation + the upload call on top of the same list.

import { useRef, useState } from 'react';
import { Paperclip, Download } from 'lucide-react';
import { formatFileSize, validateRequestAttachment, type RequestAttachment } from '@/lib/requests/attachments';

export const REQUEST_ATTACHMENTS_CSS = `
.rax{margin-top:10px;}
.rax-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--spec-text-2nd,#615F72);margin-bottom:6px;}
.rax-empty{font-size:12.5px;color:var(--spec-text-2nd,#615F72);margin:0 0 6px;}
.rax-list{list-style:none;margin:0 0 8px;padding:0;display:flex;flex-direction:column;gap:5px;}
.rax-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:9px;background:var(--spec-surface,#EFEDF5);border:1px solid var(--spec-border,#E2DFEC);}
.rax-item svg{flex:none;width:14px;height:14px;color:var(--spec-violet-deep,#4A3DB0);}
.rax-name{flex:1;min-width:0;font-size:12.5px;color:var(--spec-ink,#141320);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rax-size{flex:none;font-size:11.5px;color:var(--spec-text-2nd,#615F72);}
.rax-dl{flex:none;display:grid;place-items:center;color:var(--spec-violet-deep,#4A3DB0);}
.rax-dl svg{width:14px;height:14px;}
.rax-attach{display:inline-flex;align-items:center;gap:6px;background:#fff;color:var(--spec-violet-deep,#4A3DB0);font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:9px;border:1px solid rgba(108,92,224,.35);cursor:pointer;font-family:inherit;}
.rax-attach:hover{background:rgba(108,92,224,.06);}
.rax-attach:disabled{opacity:.6;cursor:default;}
.rax-attach svg{width:13px;height:13px;}
.rax-err{font-size:12px;color:#B3261E;margin:6px 0 0;}
`;

export interface RequestAttachmentsLabels {
  heading: string;
  empty: string;
  download: string;
}

/** Read-only list — the ONLY thing a vendor ever renders (no upload control). */
export function RequestAttachmentsList({
  attachments,
  labels,
}: {
  attachments: RequestAttachment[];
  labels: RequestAttachmentsLabels;
}) {
  if (attachments.length === 0) {
    return (
      <div className="rax">
        <div className="rax-head"><Paperclip aria-hidden="true" />{labels.heading}</div>
        <p className="rax-empty">{labels.empty}</p>
      </div>
    );
  }
  return (
    <div className="rax">
      <div className="rax-head"><Paperclip aria-hidden="true" />{labels.heading}</div>
      <ul className="rax-list">
        {attachments.map((a) => (
          <li className="rax-item" key={a.id}>
            <Paperclip aria-hidden="true" />
            <span className="rax-name" title={a.file_name}>{a.file_name}</span>
            <span className="rax-size">{formatFileSize(a.size_bytes)}</span>
            {a.url && (
              <a className="rax-dl" href={a.url} aria-label={`${labels.download} ${a.file_name}`}>
                <Download aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RequestAttachmentUploadLabels extends RequestAttachmentsLabels {
  attach: string;
  uploading: string;
  errorFor: (code: string) => string;
}

/** Buyer-only: the read-only list ABOVE, plus an "attach a file" control. */
export function RequestAttachmentUpload({
  quoteRequestId,
  initialAttachments,
  labels,
}: {
  quoteRequestId: string;
  initialAttachments: RequestAttachment[];
  labels: RequestAttachmentUploadLabels;
}) {
  const [items, setItems] = useState<RequestAttachment[]>(initialAttachments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File) {
    const validation = validateRequestAttachment({ name: file.name, size: file.size }, items.length);
    if (!validation.ok) {
      setError(labels.errorFor(validation.error.code));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('quote_request_id', quoteRequestId);
      fd.append('file', file);
      const res = await fetch('/api/buyer/request-attachments', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.ok && data.attachment) {
        setItems((prev) => [...prev, data.attachment]);
      } else {
        setError(labels.errorFor(data.code) || labels.errorFor('upload_failed'));
      }
    } catch {
      setError(labels.errorFor('upload_failed'));
    }
    setBusy(false);
  }

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-picking the same file later
    // Sequential, one-file-per-request-body (see src/lib/requests/attachments.ts).
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(f);
    }
  }

  return (
    <div className="rax">
      <RequestAttachmentsList attachments={items} labels={labels} />
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleSelect}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button type="button" className="rax-attach" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Paperclip aria-hidden="true" />
        {busy ? labels.uploading : labels.attach}
      </button>
      {error && <p className="rax-err" role="alert">{error}</p>}
    </div>
  );
}
