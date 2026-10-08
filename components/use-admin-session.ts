"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminApiError, adminRequest } from "@/lib/admin-api";

type Session = { authenticated: boolean; email: string; mustChangePassword: boolean };

export function useAdminSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void adminRequest<Session>("/api/admin/session", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setSession(result);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof AdminApiError && cause.status === 401) {
          router.replace("/admin/login/");
        } else {
          setError(cause instanceof Error ? cause.message : "Could not reach the admin API.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [router]);

  return { session, loading, error, setSession };
}
