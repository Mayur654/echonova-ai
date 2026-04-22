// middleware.ts
// The basic @supabase/supabase-js client stores sessions in localStorage,
// NOT in cookies. Cookie-based session detection always returns false,
// which caused a redirect loop: /login → /dashboard → /login.
//
// Route protection is handled client-side via useAuth() in each layout.
// To use server-side protection, migrate to @supabase/ssr.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};