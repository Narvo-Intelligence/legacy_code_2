# Supabase Email Template Configuration for Narvo

> **Status: APPLIED** — All 4 email templates have been applied to the Supabase Dashboard.
> Google OAuth provider is configured and working.

## Templates Applied

| Template | Subject | Status |
|----------|---------|--------|
| Confirmation | `NARVO // Verify Your Access` | Applied |
| Password Reset | `NARVO // Access Key Recovery` | Applied |
| Magic Link | `NARVO // Instant Access Link` | Applied |
| Invite | `NARVO // You've Been Invited` | Applied |

## How to Update These Templates

1. Go to your **Supabase Dashboard** → **Authentication** → **Email Templates**
2. For each template type, paste the corresponding HTML below
3. Save changes

---

## 1. Confirmation Email (Verify Email)

**Subject:** `NARVO // Verify Your Access`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;font-family:'Courier New',monospace;padding:40px 20px;">
  <tr><td align="center">
    <table width="500" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #628141;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #628141;">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#e8e4d9;letter-spacing:-0.5px;">NARVO</td>
          <td align="right" style="font-size:9px;color:#628141;font-family:'Courier New',monospace;">SYSTEM_NOTIFICATION</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:2px 0;background:linear-gradient(to right,#628141 33%,transparent 33%);"></td></tr>
      <tr><td style="padding:32px;">
        <p style="font-size:9px;color:#628141;font-family:'Courier New',monospace;margin:0 0 16px;letter-spacing:2px;">ACCESS_VERIFICATION_PROTOCOL</p>
        <h2 style="font-family:Georgia,serif;font-size:24px;color:#e8e4d9;margin:0 0 16px;">Verify Your Access.</h2>
        <p style="font-size:11px;color:#8a8a7a;font-family:'Courier New',monospace;line-height:1.8;margin:0 0 24px;">YOUR NARVO ACCOUNT HAS BEEN CREATED. CONFIRM YOUR EMAIL TO ACTIVATE YOUR BROADCAST TERMINAL AND BEGIN RECEIVING TRANSMISSIONS.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#628141;color:#1a1a1a;font-family:Georgia,serif;font-weight:bold;font-size:14px;padding:14px 32px;text-decoration:none;letter-spacing:-0.3px;">CONFIRM_ACCESS</a>
        <p style="font-size:9px;color:#8a8a7a;font-family:'Courier New',monospace;margin:24px 0 0;line-height:1.6;">IF YOU DID NOT REQUEST THIS, DISREGARD THIS TRANSMISSION.<br/>LINK EXPIRES IN 24 HOURS.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #628141;">
        <p style="font-size:8px;color:#628141;font-family:'Courier New',monospace;margin:0;">NARVO_SYS V.2.5 // ENCRYPTED_CHANNEL // 2026</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 2. Password Reset Email

**Subject:** `NARVO // Access Key Recovery`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;font-family:'Courier New',monospace;padding:40px 20px;">
  <tr><td align="center">
    <table width="500" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #628141;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #628141;">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#e8e4d9;letter-spacing:-0.5px;">NARVO</td>
          <td align="right" style="font-size:9px;color:#628141;font-family:'Courier New',monospace;">SECURITY_ALERT</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:2px 0;background:linear-gradient(to right,#c24b3e 33%,transparent 33%);"></td></tr>
      <tr><td style="padding:32px;">
        <p style="font-size:9px;color:#628141;font-family:'Courier New',monospace;margin:0 0 16px;letter-spacing:2px;">ACCESS_KEY_RECOVERY</p>
        <h2 style="font-family:Georgia,serif;font-size:24px;color:#e8e4d9;margin:0 0 16px;">Reset Your Access Key.</h2>
        <p style="font-size:11px;color:#8a8a7a;font-family:'Courier New',monospace;line-height:1.8;margin:0 0 24px;">A PASSWORD RESET WAS REQUESTED FOR YOUR NARVO TERMINAL. USE THE LINK BELOW TO SET A NEW ACCESS CODE.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#628141;color:#1a1a1a;font-family:Georgia,serif;font-weight:bold;font-size:14px;padding:14px 32px;text-decoration:none;letter-spacing:-0.3px;">RESET_ACCESS_KEY</a>
        <p style="font-size:9px;color:#8a8a7a;font-family:'Courier New',monospace;margin:24px 0 0;line-height:1.6;">IF YOU DID NOT REQUEST THIS, YOUR ACCOUNT IS SECURE.<br/>LINK EXPIRES IN 1 HOUR.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #628141;">
        <p style="font-size:8px;color:#628141;font-family:'Courier New',monospace;margin:0;">NARVO_SYS V.2.5 // ENCRYPTED_CHANNEL // 2026</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 3. Magic Link Email

**Subject:** `NARVO // Instant Access Link`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;font-family:'Courier New',monospace;padding:40px 20px;">
  <tr><td align="center">
    <table width="500" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #628141;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #628141;">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#e8e4d9;letter-spacing:-0.5px;">NARVO</td>
          <td align="right" style="font-size:9px;color:#628141;font-family:'Courier New',monospace;">INSTANT_ACCESS</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:2px 0;background:linear-gradient(to right,#628141 33%,transparent 33%);"></td></tr>
      <tr><td style="padding:32px;">
        <p style="font-size:9px;color:#628141;font-family:'Courier New',monospace;margin:0 0 16px;letter-spacing:2px;">DIRECT_LINK_PROTOCOL</p>
        <h2 style="font-family:Georgia,serif;font-size:24px;color:#e8e4d9;margin:0 0 16px;">Your Access Link.</h2>
        <p style="font-size:11px;color:#8a8a7a;font-family:'Courier New',monospace;line-height:1.8;margin:0 0 24px;">CLICK BELOW TO ACCESS YOUR NARVO TERMINAL INSTANTLY. NO PASSWORD REQUIRED.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#628141;color:#1a1a1a;font-family:Georgia,serif;font-weight:bold;font-size:14px;padding:14px 32px;text-decoration:none;letter-spacing:-0.3px;">ACCESS_TERMINAL</a>
        <p style="font-size:9px;color:#8a8a7a;font-family:'Courier New',monospace;margin:24px 0 0;line-height:1.6;">THIS LINK IS SINGLE-USE AND EXPIRES IN 1 HOUR.<br/>DO NOT SHARE THIS LINK.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #628141;">
        <p style="font-size:8px;color:#628141;font-family:'Courier New',monospace;margin:0;">NARVO_SYS V.2.5 // ENCRYPTED_CHANNEL // 2026</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## 4. Invite Email

**Subject:** `NARVO // You've Been Invited`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;font-family:'Courier New',monospace;padding:40px 20px;">
  <tr><td align="center">
    <table width="500" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border:1px solid #628141;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #628141;">
        <table width="100%"><tr>
          <td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#e8e4d9;letter-spacing:-0.5px;">NARVO</td>
          <td align="right" style="font-size:9px;color:#628141;font-family:'Courier New',monospace;">OPERATOR_INVITE</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:2px 0;background:linear-gradient(to right,#628141 33%,transparent 33%);"></td></tr>
      <tr><td style="padding:32px;">
        <p style="font-size:9px;color:#628141;font-family:'Courier New',monospace;margin:0 0 16px;letter-spacing:2px;">INVITATION_PROTOCOL</p>
        <h2 style="font-family:Georgia,serif;font-size:24px;color:#e8e4d9;margin:0 0 16px;">You're Invited to Narvo.</h2>
        <p style="font-size:11px;color:#8a8a7a;font-family:'Courier New',monospace;line-height:1.8;margin:0 0 24px;">YOU HAVE BEEN INVITED TO JOIN NARVO — A PRECISION-ENGINEERED, AUDIO-FIRST NEWS BROADCAST PLATFORM FOR GLOBAL AUDIENCES.</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#628141;color:#1a1a1a;font-family:Georgia,serif;font-weight:bold;font-size:14px;padding:14px 32px;text-decoration:none;letter-spacing:-0.3px;">ACCEPT_INVITATION</a>
        <p style="font-size:9px;color:#8a8a7a;font-family:'Courier New',monospace;margin:24px 0 0;line-height:1.6;">THIS INVITATION EXPIRES IN 7 DAYS.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #628141;">
        <p style="font-size:8px;color:#628141;font-family:'Courier New',monospace;margin:0;">NARVO_SYS V.2.5 // ENCRYPTED_CHANNEL // 2026</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Supabase Dashboard Setup

### Google OAuth: CONFIGURED
- Provider enabled in Supabase Dashboard → Authentication → Providers → Google
- Google OAuth Client ID and Secret configured
- Redirect URL: `https://strekawvjpyjlahmsatw.supabase.co/auth/v1/callback`
- Code: `signInWithGoogle()` in `AuthContext.js` uses `VITE_PUBLIC_URL` / backend URL for redirect

### URL Configuration: CONFIGURED
- **Site URL**: Set to your frontend URL (e.g. `http://localhost:3000` or your production URL)
- **Redirect URLs**: Add your frontend origin and `/**` (e.g. `http://localhost:3000/**`)

### General Auth Settings:
- Email confirmations: Enabled
- Minimum password length: 6 characters
