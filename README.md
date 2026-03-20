# Students Jobs

## Setup
1. Create a `.env` file based on `.env.example`.
2. Install dependencies and start the server.

## Environment Variables
- `DATABASE_URL`: Postgres connection string.
- `PORT`: Server port (default `3000`).
- `MAX_JOBS`: Max jobs to seed (default `60`).

### Brevo (password reset emails)
- `BREVO_API_KEY`: Brevo API key.
- `BREVO_SENDER_EMAIL`: Verified sender email in Brevo.
- `BREVO_SENDER_NAME`: Sender name.

### Password reset limits
- `RESET_CODE_TTL_MINUTES`: Verification code expiry in minutes (default `10`).
- `RESET_CODE_COOLDOWN_SECONDS`: Minimum seconds between code requests per email (default `60`).
- `RESET_CODE_MAX_PER_HOUR`: Max code requests per email per hour (default `5`).
