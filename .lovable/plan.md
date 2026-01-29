

# Secure Admin Authentication System

## Overview

Implement a proper database-backed authentication system that protects the entire app while keeping the Client Contact Form (`/client-form/:clientId`) public. Team members will have their own login credentials, with admin capabilities to add more users.

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
| Email/Password Login | Secure login using Lovable Cloud database |
| Team Support | Multiple team members with own credentials |
| User Management | Admin can add/remove team members |
| Session Persistence | Stay logged in across browser sessions |
| Public Client Form | `/client-form/:clientId` remains accessible without login |
| Auto Email Confirm | New users are automatically confirmed (no email verification needed) |

## Database Schema

### 1. Profiles Table
Stores user information linked to authentication:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. User Roles Table
Stores roles separately (security best practice):

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

### 3. Security Functions & Policies
- Auto-create profile when user signs up (trigger)
- RLS policies for secure data access
- `has_role()` function for role checking

## Implementation Steps

### Step 1: Database Setup
Create the profiles and user_roles tables with:
- RLS policies enabled
- Trigger to auto-create profile on signup
- Security definer function for role checking

### Step 2: Auth Context & Hooks
Create authentication infrastructure:

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Auth state management, session handling |
| `src/hooks/useAuth.ts` | Easy access to auth context |

### Step 3: Login Page
Create a beautiful login page (`src/pages/Login.tsx`):
- Email and password inputs
- Pink/rose gradient theme (matching your app style)
- Loading states and error handling
- "Remember me" functionality

### Step 4: Protected Routes Component
Create route protection (`src/components/auth/ProtectedRoute.tsx`):
- Wraps all protected routes
- Redirects to login if not authenticated
- Shows loading state while checking session

### Step 5: User Management UI
Add admin features in Settings:
- View all team members
- Invite new team members (email/password)
- Remove team members
- Only visible to admins

### Step 6: Update App.tsx
Modify routing structure:
- Wrap protected routes with `ProtectedRoute`
- Keep `/client-form/:clientId` outside protection
- Add `/login` route

## New Files to Create

| File | Description |
|------|-------------|
| `src/contexts/AuthContext.tsx` | Auth provider with session management |
| `src/hooks/useAuth.ts` | Hook to access auth context |
| `src/pages/Login.tsx` | Login page UI |
| `src/components/auth/ProtectedRoute.tsx` | Route protection wrapper |
| `src/components/auth/LogoutButton.tsx` | Logout functionality |
| `src/components/settings/TeamManagement.tsx` | User management for admins |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add AuthProvider, ProtectedRoute, Login route |
| `src/pages/Settings.tsx` | Add Team Management section |
| `supabase/config.toml` | Enable auto-confirm for email signups |

## First Admin Account

After implementing, you'll create your first admin account:
1. Go to `/login`
2. Sign up with your email and password
3. The first user will automatically become admin
4. Then you can add more team members through Settings

## Security Features

- Passwords stored securely (bcrypt hashing by Supabase)
- JWT tokens for session management
- RLS policies protect database access
- Roles stored in separate table (prevents privilege escalation)
- Auto session refresh

