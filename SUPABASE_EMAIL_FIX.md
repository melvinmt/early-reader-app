# Fix: Still Receiving Magic Link Instead of OTP Code

## Quick Fix Steps

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Email Templates**
   - Click: **Authentication** → **Email Templates**
   - Direct URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/templates`

3. **Find the Template Used by `signInWithOtp()`**
   - Look for the template that has "Magic Link" in the name or subject
   - This is the template that `signInWithOtp()` uses

4. **Check Current Template Content**
   - Open the template editor
   - Look for `{{ .ConfirmationURL }}` in the content
   - If you see it, that's why you're getting Magic Links

5. **Replace the Entire Template Content**

   **DELETE everything in the template and replace with:**

   ```html
   <h2>Confirm Your Signup</h2>
   <p>Your 6-digit verification code is:</p>
   <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center;">{{ .Token }}</p>
   <p>Enter this code in the app to complete your signup.</p>
   ```

6. **Update the Subject Line**
   - Change subject from "Your Magic Link" to "Confirm Your Signup"

7. **Save the Template**
   - Click Save/Update
   - Wait 1-2 minutes for changes to propagate

8. **Test**
   - Request a new OTP code in the app
   - Check your email - you should now see a 6-digit code, not a link

## Verification Checklist

- [ ] Template content contains `{{ .Token }}`
- [ ] Template content does NOT contain `{{ .ConfirmationURL }}`
- [ ] Subject line does not say "Magic Link"
- [ ] Template has been saved
- [ ] Waited 1-2 minutes after saving
- [ ] Requested a NEW OTP code (old emails will still have links)

## Common Mistakes

1. **Only adding `{{ .Token }}` but not removing `{{ .ConfirmationURL }}`**
   - If both are present, Supabase sends a Magic Link
   - You MUST remove `{{ .ConfirmationURL }}` completely

2. **Editing the wrong template**
   - Make sure you're editing the template used by `signInWithOtp()`
   - It's usually named "Magic Link" in the dashboard

3. **Not waiting for propagation**
   - Template changes take 1-2 minutes to take effect
   - Request a NEW code after waiting

4. **Using cached email**
   - Old emails will still show links
   - You must request a NEW OTP code after updating the template

## Still Not Working?

1. **Double-check the template content**
   - Search for `ConfirmationURL` - it should NOT appear anywhere
   - Search for `Token` - it SHOULD appear

2. **Check all email templates**
   - Sometimes there are multiple templates
   - Make sure you updated the correct one

3. **Try a different email address**
   - Some email clients cache templates
   - Test with a fresh email address

4. **Check Supabase logs**
   - Go to Logs → Auth Logs
   - See what's actually being sent







