# CV Optimizer KE

AI-powered CV optimization software for the Kenyan job market. It analyzes a PDF CV against a job description and returns ATS and match scores, missing keywords, a rewritten summary, weak sections, and interview tips.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)
![MariaDB](https://img.shields.io/badge/MariaDB-003545)
![Groq](https://img.shields.io/badge/Groq-AI-orange)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- PDF CV upload and text extraction
- Groq-powered CV and job-description analysis
- ATS, match, and readability scores
- Missing and matched keyword suggestions
- Rewritten professional summary
- Job-specific interview tips
- Local signup/login with bcrypt password hashing
- HTTP-only, server-side cookie sessions
- One free analysis per account
- Additional analyses through M-Pesa Daraja STK Push
- User dashboard and analysis history
- Small admin dashboard and user detail view
- API documentation at `/docs`

## Technology

| Area | Technology |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js route handlers |
| Database | MariaDB |
| Database client | mysql2 |
| Authentication | bcryptjs password hashing and local database sessions |
| AI | Groq Chat Completions API |
| PDF parsing | unpdf |
| Payments | Safaricom M-Pesa Daraja STK Push |
| Testing | Jest |

## Architecture

```text
Browser
  -> Next.js pages and components
  -> Next.js API route handlers
       -> Groq API for CV analysis
       -> MariaDB for users, sessions, analyses, and payments
       -> Safaricom Daraja API for M-Pesa STK Push
       -> Daraja callback route for payment confirmation
```

The application does not require Supabase or another hosted database. Groq and Daraja are retained as external integrations.

## Project Structure

```text
src/
  app/
    (auth)/login/          Login page
    (auth)/signup/         Signup page
    admin/                 Admin dashboard and user details
    analyze/               PDF upload and analysis page
    dashboard/             User dashboard
    docs/                  API documentation
    api/
      auth/                Login, signup, logout, and current-user routes
      analyze/             CV analysis route
      admin/               Admin statistics and user routes
      mpesa/               STK Push initiation and callback routes
      dashboard/           Dashboard data route
  lib/
    auth.ts                Cookie sessions and current-user lookup
    db.ts                  MariaDB connection pool
    mpesa.ts               Daraja API integration
database.sql               MariaDB schema
.env.example               Environment variable template
```

## Prerequisites

- Node.js 22.16 or newer
- npm
- MariaDB 10.6 or newer
- A Groq API key
- Safaricom Daraja sandbox or production credentials
- An HTTPS, publicly reachable callback URL for Daraja

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the MariaDB database

Run the schema script:

```bash
mariadb -u root -p < database.sql
```

Then create or reuse a database user with access to `cv_optimiser`.

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

```env
# Groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b

# MariaDB
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=cv_optimizer
DB_PASSWORD=
DB_NAME=cv_optimiser

# M-Pesa Daraja
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SESSION_DAYS=7
```

`MPESA_CALLBACK_URL` must be an HTTPS public URL that points to `/api/mpesa/callback`. For local testing, use an HTTPS tunnel to expose port 3000.

### 4. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## M-Pesa Testing

The M-Pesa integration uses Daraja sandbox endpoints.

1. Configure valid sandbox consumer credentials, short code, passkey, and callback URL.
2. Use a Daraja sandbox test phone number.
3. Enter the phone number in the format `07XXXXXXXX` or `2547XXXXXXXXX`.
4. Use the public HTTPS callback URL so Safaricom can deliver payment confirmations.

Without a public callback URL, Daraja will reject the STK Push request with an invalid callback URL error.

## Database Tables

- `users`: account details, password hash, roles, and analysis credit counters
- `sessions`: HTTP-only session identifiers and expiry timestamps
- `analyses`: job title, scores, full analysis result, and payment state
- `payments`: phone number, amount, status, receipt, and Daraja request identifiers

The complete table definitions are in `database.sql`.

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account and session |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Delete the current session |
| GET | `/api/auth/me` | Get the current user |
| GET | `/api/dashboard` | Get dashboard profile and analysis history |
| POST | `/api/analyze` | Analyze a CV |
| POST | `/api/mpesa/initiate` | Start an STK Push |
| POST | `/api/mpesa/callback` | Receive Daraja payment callbacks |
| GET | `/api/admin/stats` | Get admin statistics |
| GET | `/api/admin/users/:id` | Get a user's profile and analyses |

Detailed request and response examples are available in the in-app API documentation.

## Scripts

```bash
npm run dev
npm test -- --runInBand
npm run build
npm run lint
npm start
```

## Tests

The Jest suite currently covers analysis response parsing, Daraja phone formatting, score colors, free-analysis eligibility, payment requirements, and CV text validation.

```bash
npm test -- --runInBand
```

## Creating an Admin

Set `is_admin = 1` for a user in MariaDB:

```sql
USE cv_optimiser;
UPDATE users SET is_admin = 1 WHERE email = 'admin@example.com';
```

The admin account must log in again after the role is changed.

## Production Notes

- Replace sandbox Daraja credentials and URLs before production use.
- Use secrets from the deployment environment rather than committing credentials.
- Use a strong random password for the MariaDB application user.
- Back up MariaDB regularly.
- Serve the application over HTTPS.
- Keep `MPESA_CALLBACK_URL` synchronized with the deployed public domain.
- Remove or restrict admin accounts after testing.

## Author

Eric

## License

MIT
