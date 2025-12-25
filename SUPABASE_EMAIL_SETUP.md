# Supabase Email Template Configuration

## Problem
Supabase is sending Magic Link emails instead of 6-digit OTP codes.

## Solution
Configure the **Magic Link** email template in your Supabase Dashboard to include `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.

## Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Email Templates**
   - Go to: **Authentication** → **Email Templates**
   - Or direct link: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/templates`

3. **Edit the Magic Link Template**
   - Click on **"Magic Link"** template
   - This is the template used by `signInWithOtp()` method

4. **Update the Template Content**
   
   **Current (Magic Link - WRONG):**
   ```html
   <h2>Magic Link</h2>
   <p>Follow this link to login:</p>
   <p><a href="{{ .ConfirmationURL }}">Log In</a></p>
   ```

   **Updated (OTP Code - CORRECT):**
   ```html
   <h2>Your login code</h2>
   <p>Your 6-digit code is: <strong>{{ .Token }}</strong></p>
   <p>Enter this code in the app to sign in.</p>
   ```

5. **Save the Template**
   - Click **Save** or **Update**

## How It Works

- When `signInWithOtp()` is called, Supabase checks the Magic Link template
- If the template contains `{{ .Token }}`, it sends a 6-digit OTP code
- If the template contains `{{ .ConfirmationURL }}`, it sends a Magic Link
- The presence of `{{ .Token }}` in the template determines the behavior

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{ .Token }}` | 6-digit OTP code (e.g., "123456") |
| `{{ .ConfirmationURL }}` | Magic Link URL for one-click login |
| `{{ .Email }}` | User's email address |
| `{{ .SiteURL }}` | Your app's site URL |

## Verification

After updating the template:
1. Request a new OTP code in the app
2. Check your email
3. You should receive an email with a 6-digit code (e.g., "123456")
4. The email should NOT contain a clickable "Log In" link

## References

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp)

