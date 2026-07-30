export interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

export interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce?: string;
        ux_mode?: 'popup' | 'redirect';
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          logo_alignment?: 'left' | 'center';
          width?: number;
          locale?: string;
        },
      ): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let googleIdentityScript: Promise<GoogleIdentity> | null = null;

/** Load Google's official button library once, even when React remounts. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services requires a browser.'));
  }
  if (window.google) return Promise.resolve(window.google);
  if (googleIdentityScript) return googleIdentityScript;

  const pending = new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://accounts.google.com/gsi/client"]',
    );
    const script = existing || document.createElement('script');

    const finish = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Identity Services did not initialize.'));
    };
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Identity Services failed to load.')), {
      once: true,
    });

    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    googleIdentityScript = null;
    throw error;
  });
  googleIdentityScript = pending;
  return pending;
}

/** Supabase expects the raw nonce; Google receives its SHA-256 hex digest. */
export async function createGoogleNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const encoded = new TextEncoder().encode(nonce);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { nonce, hashedNonce };
}

/** Mark an already-authenticated GIS return for the shared server callback. */
export function buildGoogleDirectCallback(redirectTo: string): string {
  const url = new URL(redirectTo);
  url.searchParams.set('oauth_direct', 'google');
  return url.toString();
}
