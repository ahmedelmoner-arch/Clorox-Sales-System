# Clorox Sales System

The application is prepared for a single Vercel deployment:

- React frontend is built from `frontend`.
- Express API is deployed as a Vercel Service from `backend`.
- Google Sheets credentials are supplied through Vercel environment variables and are never committed.

## Required Vercel environment variables

Add each value to both the `Production` and `Preview` environments:

```text
SPREADSHEET_ID=<Google Sheet ID>
GOOGLE_SERVICE_ACCOUNT_JSON=<entire service-account JSON file on one line>
JWT_SECRET=<long random secret>
```

For a custom frontend domain, set `CORS_ORIGINS` to its exact origin (for example, `https://sales.example.com`). Multiple origins can be comma-separated. Do not use wildcards.

## Deploy

1. Push this repository to GitHub without any `.env` files or `backend/config/service-account.json`.
2. Import the repository into Vercel with the repository root as the project root.
3. Add the required environment variables.
4. Deploy to production.

For local development, keep `GOOGLE_SERVICE_ACCOUNT=./config/service-account.json` in `backend/.env` and set `VITE_API_BASE_URL=http://localhost:5050/api` in `frontend/.env`.
