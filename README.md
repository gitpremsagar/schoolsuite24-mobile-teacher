# SchoolSuite Teacher

Expo (React Native) mobile app for school **teachers**.

## Setup

```bash
cd mobile-teacher
npm install
cp .env.example .env   # then set EXPO_PUBLIC_API_URL
npx expo start
```

`.env` should point at the hosted API:

```
EXPO_PUBLIC_API_URL=https://be-schoolsuite24.vercel.app
```

## Auth

- Teachers only (`role === "TEACHER"`). Other roles are rejected at login.
- Access + refresh tokens live in SecureStore under teacher-specific keys so this app can coexist with `mobile-admin` on the same device.
- Expired sessions clear tokens and return to login.

## Features

- **Today** — greeting, punch card, pending attendance per assigned class
- **Classes** — assigned classes, roster, month attendance %
- **Attendance** — day marker + month register (assignment-scoped writes)
- **More** — punch, profile, school, theme settings

## Scripts

- `npm start` — Expo dev server
- `npm run ios` / `npm run android` / `npm run web`
- `npm run lint`
