// Anti-circumvention content guard. Before a deal is committed (buyer accepts
// the quote), messages must not carry contact details that let the parties
// take the deal off NXT//LINK. Emails, phone numbers, and links are masked;
// the protected period + commission clause still applies regardless.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// 7+ digits with common separators/prefixes (covers US/MX formats).
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{2,4}([\s.-]?\d{2,4})?/g;
const URL_RE = /(https?:\/\/|www\.)[^\s]+/gi;
const HANDLE_RE = /\b(whatsapp|telegram|wa\.me|t\.me|skype|signal)\b[^\s]*/gi;

const MASK = '[hidden until the quote is accepted]';

function digitCount(s: string): number {
  return (s.match(/\d/g) || []).length;
}

/** Mask contact details in free text. Returns the cleaned text + whether anything was hidden. */
export function maskContacts(text: string): { masked: string; found: boolean } {
  let found = false;
  let out = text.replace(EMAIL_RE, () => { found = true; return MASK; });
  out = out.replace(URL_RE, () => { found = true; return MASK; });
  out = out.replace(HANDLE_RE, () => { found = true; return MASK; });
  // Phones: only mask matches that actually contain 7+ digits (avoid prices/qtys).
  out = out.replace(PHONE_RE, (m) => {
    if (digitCount(m) >= 7) { found = true; return MASK; }
    return m;
  });
  return { masked: out, found };
}
