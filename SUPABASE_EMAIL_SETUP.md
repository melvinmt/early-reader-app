# Supabase Email Template Configuration

## Problem
Supabase is sending Magic Link emails instead of 6-digit OTP codes.

## Solution
We use `signInWithOtp()` which uses the **Magic Link** email template. Configure this template to send a 6-digit OTP code that looks like a signup confirmation email by including `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.

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
   - **Note:** Even though it's called "Magic Link", we configure it to send OTP codes

4. **Update the Template Content**
   
   **CRITICAL:** The template must ONLY contain `{{ .Token }}` and must NOT contain `{{ .ConfirmationURL }}`.
   
   **Current (Magic Link - WRONG):**
   ```html
   <h2>Magic Link</h2>
   <p>Follow this link to login:</p>
   <p><a href="{{ .ConfirmationURL }}">Log In</a></p>
   ```

   **Updated (Signup Confirmation with OTP - CORRECT):**
   ```html
   <h2>Confirm Your Signup</h2>
   <p>Your 6-digit verification code is:</p>
   <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
   <p>Enter this code in the app to complete your signup.</p>
   ```
   
   **⚠️ IMPORTANT:** 
   - Remove ALL instances of `{{ .ConfirmationURL }}` from the template
   - The template should ONLY use `{{ .Token }}`
   - If both variables are present, Supabase will default to Magic Link

5. **Save the Template**
   - Click **Save** or **Update**

## How It Works

- When `signInWithOtp()` is called, Supabase checks the Magic Link template
- **If the template contains `{{ .ConfirmationURL }}` (even if `{{ .Token }}` is also present), it sends a Magic Link**
- **If the template contains ONLY `{{ .Token }}` and NO `{{ .ConfirmationURL }}`, it sends a 6-digit OTP code**
- **You must completely remove `{{ .ConfirmationURL }}` from the template for OTP to work**

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{ .Token }}` | 6-digit OTP code (e.g., "123456") |
| `{{ .ConfirmationURL }}` | Magic Link URL for one-click login |
| `{{ .Email }}` | User's email address |
| `{{ .SiteURL }}` | Your app's site URL |

## Verification

After updating the template:
1. **Double-check the template** - Make sure there is NO `{{ .ConfirmationURL }}` anywhere in the template
2. **Save the template** in the Supabase Dashboard
3. Request a new OTP code in the app (wait a few seconds for template changes to propagate)
4. Check your email
5. You should receive an email with a 6-digit code (e.g., "123456")
6. The email should NOT contain a clickable "Log In" link

## Troubleshooting

**Still receiving Magic Links?**

1. **Check the template again** - Search for `{{ .ConfirmationURL }}` and remove it completely
2. **Check the subject line** - The subject should not reference "Magic Link"
3. **Wait a few minutes** - Template changes can take a few minutes to propagate
4. **Try a different email** - Sometimes email clients cache old templates
5. **Check if you're editing the right template** - Make sure you're editing "Magic Link", not "Confirm signup" or another template

## References

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp)

