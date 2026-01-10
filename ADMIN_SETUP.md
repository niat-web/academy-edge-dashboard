# Admin Access Setup Guide

## Overview

The dashboard is protected to prevent unauthorized access. When someone opens a student profile link (e.g., `/students/[student_uid]`), they cannot access the main dashboard unless they have an admin token.

## How to Get Admin Access

### Step 1: Set Admin Token Environment Variable

Add the `ADMIN_TOKEN` environment variable to your environment:

**For Local Development (.env.local):**
```env
ADMIN_TOKEN=your-secret-admin-token-here
```

**For Vercel Production:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `ADMIN_TOKEN`
   - **Value**: `your-secret-admin-token-here` (use a strong, random string)
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**

### Step 2: Generate a Secure Admin Token

You can generate a secure random token using one of these methods:

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
- Visit https://randomkeygen.com/
- Use a "CodeIgniter Encryption Keys" or "Fort Knox Passwords"

**Example token:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 3: Access the Admin Login Page

1. Navigate to: `https://your-domain.com/admin/login`
2. Enter your admin token
3. Click "Login"
4. You'll be redirected to the dashboard with full access

## How It Works

1. **Student Profile Access**: When someone opens a student profile link, a cookie is set indicating they accessed via a student profile link.

2. **Dashboard Protection**: The middleware checks if the user came from a student profile link. If yes, and they don't have an admin session, they're redirected to an "Access Denied" page.

3. **Admin Login**: The admin login page verifies the token against the `ADMIN_TOKEN` environment variable and sets an admin session cookie if valid.

4. **Session Duration**: The admin session lasts for 7 days. After that, you'll need to log in again.

## Security Notes

- **Keep your admin token secret**: Never commit it to version control
- **Use a strong token**: At least 32 characters, random
- **Rotate tokens**: Change your admin token periodically for security
- **HTTPS only**: Always use HTTPS in production (Vercel provides this automatically)

## Troubleshooting

### "Admin authentication not configured" Error

This means the `ADMIN_TOKEN` environment variable is not set. Make sure you:
1. Added it to your `.env.local` file (for local development)
2. Added it to Vercel environment variables (for production)
3. Redeployed your application after adding the variable

### Can't Access Dashboard After Login

1. Clear your browser cookies
2. Try logging in again
3. Make sure the token matches exactly (no extra spaces)

### Forgot Your Admin Token

1. Generate a new token
2. Update the `ADMIN_TOKEN` environment variable
3. Redeploy your application
4. Log in with the new token

## Direct Dashboard Access (Alternative)

If you prefer, you can also access the dashboard directly with the token as a query parameter:

```
https://your-domain.com/?admin=your-admin-token
```

However, using the login page is more secure as it doesn't expose the token in the URL.

