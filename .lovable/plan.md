
# Custom Domain for Client Contact Form

## The Problem

Currently, when you share the contact form link with clients, they see:
```
https://wtnclienttracker.lovable.app/client-form/2026-01-18T16%3A19%3A50.358Z
```

You want clients to see a **completely different domain** - something like:
```
https://forms.weddingtalesnepal.com/client-form/abc123
```

---

## Solution Options

### Option 1: Add a Subdomain to This Project (Recommended)

Lovable supports **multiple custom domains** on the same project. You can:

1. Keep `wtnclienttracker.lovable.app` (or your main domain) for staff
2. Add a **separate subdomain** like `forms.weddingtalesnepal.com` for clients

**How it works:**
- Both domains point to the same Lovable project
- The `/client-form/:clientId` route works on both domains
- You share only the `forms.weddingtalesnepal.com` link with clients
- Clients never see `wtnclienttracker.lovable.app`

**Steps to set up:**
1. Go to **Project Settings → Domains**
2. Click **Connect Domain**
3. Add `forms.weddingtalesnepal.com` (or your preferred subdomain)
4. Add DNS records at your domain registrar:
   - **A Record**: Name: `forms`, Value: `185.158.133.1`
5. Wait for verification (can take up to 72 hours)

**Update the app code:**
```typescript
// In src/lib/client-contact-api.ts
export function getClientFormUrl(registeredDateTimeAD: string): string {
  const encodedId = encodeURIComponent(registeredDateTimeAD);
  // Use the forms subdomain for client-facing links
  return `https://forms.weddingtalesnepal.com/client-form/${encodedId}`;
}
```

---

### Option 2: Create a Separate Lovable Project

If you want **complete separation**, you could:
1. Create a new Lovable project just for the contact form
2. Connect a custom domain to that project
3. Use an edge function to sync data between projects

**Pros:** Complete isolation, separate codebase
**Cons:** More complex, need to sync data between projects, additional maintenance

---

### Option 3: Shorten the URL (Bonus)

Regardless of which option you choose, we can also make the URL **shorter and cleaner**:

**Current:** `forms.weddingtalesnepal.com/client-form/2026-01-18T16%3A19%3A50.358Z`

**Improved:** `forms.weddingtalesnepal.com/f/abc123`

This requires:
1. Creating a lookup table (in your sheet or database) that maps short codes to client IDs
2. Updating the route to use the short code

---

## Recommended Approach

**Option 1 (Subdomain)** is the simplest and most practical:

| Step | Action | Who Does It |
|------|--------|-------------|
| 1 | Add `forms.weddingtalesnepal.com` in Project Settings → Domains | You |
| 2 | Add A record at your domain registrar | You |
| 3 | Wait for DNS propagation | Automatic |
| 4 | Update the code to use the new domain | Me (Lovable) |

---

## What You Need to Do First

1. **Decide on your subdomain name** (e.g., `forms.weddingtalesnepal.com`, `contact.weddingtalesnepal.com`, or any domain you own)

2. **Add the domain in Lovable:**
   - Go to Project Settings → Domains
   - Click "Connect Domain"
   - Enter your chosen subdomain

3. **Configure DNS at your registrar** (GoDaddy, Namecheap, Cloudflare, etc.):
   - Add an **A Record** pointing to `185.158.133.1`

4. **Tell me the domain** once it's connected, and I'll update the code

---

## Technical Changes Needed (After Domain Setup)

| File | Change |
|------|--------|
| `src/lib/client-contact-api.ts` | Update `getClientFormUrl()` to use your new domain |

---

## Next Steps

Please:
1. Choose the domain/subdomain you want to use for client forms
2. Add it in **Project Settings → Domains**
3. Configure DNS records at your registrar
4. Let me know the domain name once verified

Then I'll update the code to generate links using your new domain!
