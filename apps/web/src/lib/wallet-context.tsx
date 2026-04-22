"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type WalletType = "metamask" | "demo" | null;

type WalletCtx = {
  address:     string | null;
  walletType:  WalletType;
  connecting:  boolean;
  connectMetaMask: () => Promise<void>;
  connectDemo:     (name: string) => void;
  disconnect:      () => void;
};

const Ctx = createContext<WalletCtx>({
  address: null, walletType: null, connecting: false,
  connectMetaMask: async () => {}, connectDemo: () => {}, disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address,    setAddress]    = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [connecting, setConnecting] = useState(false);

  // Load from sessionStorage on mount (clears when tab closes)
  useEffect(() => {
    const addr = sessionStorage.getItem("wallet_address");
    const type = sessionStorage.getItem("wallet_type") as WalletType;
    if (addr && type) { setAddress(addr); setWalletType(type); }
  }, []);

  async function connectMetaMask() {
    if (typeof window === "undefined" || !("ethereum" in window)) {
      throw new Error("MetaMask not installed");
    }
    setConnecting(true);
    try {
      const eth = (window as any).ethereum;
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts[0]) throw new Error("No account returned");
      save(accounts[0], "metamask");
    } finally {
      setConnecting(false);
    }
  }

  function connectDemo(name: string) {
    // Generate deterministic address from name (for demo/hackathon)
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    const addr = "0x" + hex.repeat(5).slice(0, 40);
    save(addr, "demo");
  }

  function save(addr: string, type: WalletType) {
    setAddress(addr); setWalletType(type);
    sessionStorage.setItem("wallet_address", addr);
    sessionStorage.setItem("wallet_type",    type ?? "");
  }

  function disconnect() {
    setAddress(null); setWalletType(null);
    sessionStorage.removeItem("wallet_address");
    sessionStorage.removeItem("wallet_type");
  }

  return (
    <Ctx.Provider value={{ address, walletType, connecting, connectMetaMask, connectDemo, disconnect }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);
