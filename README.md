# AI Expense Tracker — Frontend

React/Vite dashboard for the AI Expense Tracker. It includes authentication,
account-scoped expense activity, charts, AI insights, receipt upload, and Excel
export.

## Setup

Install dependencies and create the local environment file:

```bash
npm ci
copy .env.example .env.local       # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

The default environment is:

```dotenv
VITE_API_BASE_URL=/api
VITE_DEV_API_PROXY_TARGET=http://localhost:8080
```

With these values, Vite proxies `/api` requests to the local Spring Boot API,
so the browser does not need a separate local API origin. Change
`VITE_DEV_API_PROXY_TARGET` if the backend uses another port. For a production
build hosted separately from the API, set `VITE_API_BASE_URL` to the deployed
backend URL ending in `/api` before running `npm run build`. The production
fallback is currently configured for:

```text
https://ai-expense-tracker-ow9p.onrender.com/api
```

For Netlify, set `VITE_API_BASE_URL` to that same value in the site's build
environment and trigger a new deploy. This keeps the deployment configuration
explicit while allowing the checked-in build fallback to work.

## Supported receipt uploads

The receipt picker accepts PNG, JPEG, and WebP images up to 5 MB, matching the
backend validation. Other files are rejected before an API request is made.

## Checks

```bash
npm run lint
npm run build
```

The frontend API client uses the JWT saved by the authentication flow and logs
the user out when the API returns `401 Unauthorized`.
