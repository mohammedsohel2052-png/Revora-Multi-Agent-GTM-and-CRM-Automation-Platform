# Revora — Live External Provider Credentials Setup Guide

This guide walks you through acquiring and setting up live API credentials for **Stripe**, **Meta (WhatsApp Cloud API)**, and **Google Calendar** to connect with your local or production Revora instance.

Your workspace `.env` file has been prepared at: [`.env`](file:///.env).

---

## 1. Stripe Setup (Billing & Webhooks)

### Step 1.1: Get API Keys
1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/) and sign in or create an account.
2. Ensure the top-right toggle is set to **Test Mode** (orange badge).
3. Navigate to **Developers** → **API keys** ([dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)).
4. Copy the following keys:
   - **Publishable key** (`pk_test_...`) → Paste into `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env`
   - **Secret key** (`sk_test_...`) → Click *Reveal test key* and paste into `STRIPE_SECRET_KEY` in `.env`

### Step 1.2: Get Webhook Signing Secret (`whsec_...`)

#### Option A: Local Testing with Stripe CLI (Recommended)
1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) (`winget install stripe.stripe-cli` or `scoop install stripe`).
2. Log in with your Stripe account:
   ```bash
   stripe login
   ```
3. Start forwarding webhook events to your local NestJS backend:
   ```bash
   stripe listen --forward-to localhost:4000/webhooks/stripe
   ```
4. The terminal will print:
   ```text
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
   ```
5. Copy this `whsec_...` value and paste it into `STRIPE_WEBHOOK_SECRET` in `.env`.

#### Option B: Staging / Production Dashboard Webhook
1. Go to **Developers** → **Webhooks** → **Add an endpoint**.
2. **Endpoint URL**: `https://<your-public-domain>/webhooks/stripe`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
4. Save and click **Reveal** under **Signing secret** to obtain `whsec_...`.

---

## 2. Meta WhatsApp Cloud API Setup

### Step 2.1: Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **My Apps** → **Create App**.
3. Select **Other** as the use case, then choose **Business** as the app type.
4. Name your app (e.g., `Revora GTM Hub`) and link your Meta Business Account.

### Step 2.2: Add WhatsApp Product
1. In the App Dashboard sidebar, scroll to **Add a product** and click **Set up** on **WhatsApp**.
2. Go to **WhatsApp** → **API Setup**:
   - **Phone number ID**: Copy the numeric ID → Paste into `WHATSAPP_PHONE_NUMBER_ID` in `.env`.
   - **Temporary Access Token**: Copy the token (`EAAG...`) → Paste into `WHATSAPP_ACCESS_TOKEN` in `.env`.
   - *(Optional for Production)*: Create a System User in [business.facebook.com](https://business.facebook.com/settings/system-users) with `whatsapp_business_messaging` permissions to get a non-expiring permanent token.

### Step 2.3: Get App Secret
1. Go to **App Settings** → **Basic** in the left sidebar.
2. Copy **App ID** → Paste into `META_APP_ID`.
3. Click **Show** next to **App Secret** → Copy and paste into `META_APP_SECRET`.

### Step 2.4: Configure Webhooks
1. In the left menu, select **WhatsApp** → **Configuration**.
2. Click **Edit** next to **Webhook**:
   - **Callback URL**: `https://<your-ngrok-or-domain>/webhooks/whatsapp`
   - **Verify Token**: Define a secret passphrase (e.g., `revora_wa_verify_token_2026`) and paste into `WHATSAPP_WEBHOOK_SECRET` in `.env`.
3. Click **Verify and Save**.
4. In Webhook fields, click **Manage** and subscribe to **`messages`**.

---

## 3. Google Calendar OAuth 2.0 Setup

### Step 3.1: Create Google Cloud Project & Enable API
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `Revora Automation`.
3. Navigate to **APIs & Services** → **Library**.
4. Search for **Google Calendar API** and click **Enable**.

### Step 3.2: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**.
2. Select **External** and click **Create**.
3. Fill in:
   - **App name**: `Revora GTM`
   - **User support email**: your Google account email
   - **Developer contact information**: your email
4. In **Scopes**, click **Add or Remove Scopes** and add:
   - `.../auth/calendar.events` (View and edit events on all your calendars)
5. In **Test Users**, add the Google email account you plan to test with.

### Step 3.3: Create OAuth 2.0 Client Credentials
1. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. **Application type**: Select **Web application**.
3. **Name**: `Revora Local Server`.
4. **Authorized redirect URIs**: Add:
   ```text
   http://localhost:4000/api/v1/integrations/google/callback
   ```
5. Click **Create**.
6. A dialog will show your credentials:
   - **Client ID**: Copy and paste into `GOOGLE_CLIENT_ID` in `.env`.
   - **Client secret**: Copy and paste into `GOOGLE_CLIENT_SECRET` in `.env`.

---

## 4. Summary Table of Environment Variables

| Variable Name | Provider | Where to find it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Developers → API keys (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Developers → API keys (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `stripe listen` CLI output or Dashboard Webhook (`whsec_...`) |
| `META_APP_ID` | Meta | App Dashboard → Settings → Basic |
| `META_APP_SECRET` | Meta | App Dashboard → Settings → Basic |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta | WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta | WhatsApp → API Setup or System User |
| `WHATSAPP_WEBHOOK_SECRET` | Meta | Your custom verify passphrase |
| `GOOGLE_CLIENT_ID` | Google | Credentials → OAuth 2.0 Client IDs (`...apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Google | Credentials → OAuth 2.0 Client IDs |
| `GOOGLE_REDIRECT_URI` | Google | Must match Authorized Redirect URI in Google Cloud Console |

---

## 5. Verifying Your Configuration

Once you've filled in your keys in [`.env`](file:///.env), test your configuration with our automated integration suites:

```bash
# Verify Stripe webhook signature and checkout validation
npx jest tests/integration/payment.e2e.spec.ts

# Verify Webhook security and HMAC verification
npx jest tests/security/webhook-security.e2e.spec.ts

# Verify Calendar booking coordination
npx jest tests/integration/booking.e2e.spec.ts
```
