

# Simple Admin Authentication System

## Overview

Implement a straightforward email/password login that protects the entire app with a single admin account. The Client Contact Form (`/client-form/:clientId`) will remain public. No roles or team management needed for now.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        App Entry                            │
│                                                             │
│   /client-form/:clientId ──→ PUBLIC (No auth required)     │
│                                                             │
│   All other routes ──→ AuthProvider ──→ Login Required     │
│                           │                                 │
│                           ▼                                 │
│                    Check Session                            │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              │                         │                    │
│         Logged In               Not Logged In               │
│              │                         │                    │
│              ▼                         ▼                    │
│         Show App               Show Login Page              │
└─────────────────────────────────────────────────────────────┘
```

## What You'll Get

| Feature | Description |
|---------|-------------|
| Email/Password Login | Secure login using Lovable Cloud |
| Single Admin | One admin account for you |
| Session Persistence | Stay logged in across browser sessions |
| Public Client Form | `/client-form/:clientId` remains accessible without login |
| Logout Button | Easy logout from Settings page |

## Simplified Approach

Since you only need one admin account:
- No profiles table needed
- No user roles table needed
- Just use Lovable Cloud's built-in authentication
- You'll create your admin account on first signup
- Auto-confirm enabled (no email verification needed)

## Database Setup

Minimal setup required:
- Enable auto-confirm for email signups (no email verification)
- No additional tables needed for basic auth

## Implementation Steps

### Step 1: Configure Auto-Confirm
Enable auto-confirm so you don't need email verification when signing up.

### Step 2: Auth Context & Hooks
Create simple authentication infrastructure:

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Auth state management, session handling |
| `src/hooks/useAuth.ts` | Easy access to auth context |

### Step 3: Login Page
Create a login page (`src/pages/Login.tsx`):
- Email and password inputs
- Sign up option (for creating your admin account)
- Pink/rose gradient theme (matching your app style)
- Loading states and error handling

### Step 4: Protected Routes Component
Create route protection (`src/components/auth/ProtectedRoute.tsx`):
- Wraps all protected routes
- Redirects to login if not authenticated
- Shows loading state while checking session

### Step 5: Logout Button
Add logout functionality to Settings page.

### Step 6: Update App.tsx
Modify routing structure:
- Wrap protected routes with `AuthProvider`
- Keep `/client-form/:clientId` outside protection
- Add `/login` route

## New Files to Create

| File | Description |
|------|-------------|
| `src/contexts/AuthContext.tsx` | Auth provider with session management |
| `src/hooks/useAuth.ts` | Hook to access auth context |
| `src/pages/Login.tsx` | Login page UI |
| `src/components/auth/ProtectedRoute.tsx` | Route protection wrapper |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add AuthProvider, ProtectedRoute, Login route |
| `src/pages/Settings.tsx` | Add Logout button |

## How to Create Your Admin Account

After implementing:
1. Go to your app (any protected route)
2. You'll be redirected to `/login`
3. Click "Sign Up" and enter your email + password
4. You're now logged in as admin!
5. Only you know these credentials

## Security Features

- Password stored securely (bcrypt hashing)
- JWT tokens for session management
- Auto session refresh
- No credentials in code (unlike the current Accounts password)

## Future Expansion

When you're ready for team members and roles later, we can easily add:
- Profiles table for user info
- User roles table for admin/member distinction
- Team management UI in Settings

