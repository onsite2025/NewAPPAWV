'use client';

import { PropsWithChildren } from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export function Providers({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
} 