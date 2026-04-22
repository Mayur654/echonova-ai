"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

type Farmer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  state: string;
  district: string;
  user_id: string;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  farmer: Farmer | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  farmer: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);

  const lastUserId = useRef<string | null>(null); // 🔥 prevent duplicate fetch

  async function fetchFarmer(userId: string) {
    try {
      // ✅ avoid repeated calls
      if (lastUserId.current === userId) return;

      const { data, error } = await supabase
        .from("farmers")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error || !data) return;

      lastUserId.current = userId;

      setFarmer(data);

      localStorage.setItem("farmer_id", data.id);
      localStorage.setItem("farmer_name", data.name);
    } catch {}
  }

  useEffect(() => {
    let mounted = true;

    // 🔥 INITIAL SESSION LOAD
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchFarmer(session.user.id);
      }

      setLoading(false);
    });

    // 🔥 AUTH LISTENER (SAFE)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchFarmer(session.user.id);
        } else {
          setFarmer(null);
          lastUserId.current = null;
          localStorage.removeItem("farmer_id");
          localStorage.removeItem("farmer_name");
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, farmer, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}