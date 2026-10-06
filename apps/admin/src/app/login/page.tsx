"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { login, token, hydrated } = useAuth();
  const [email, setEmail] = React.useState("admin@es.local");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && token) router.replace("/dashboard");
  }, [hydrated, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">ES 商家後台</h1>
          <p className="mt-1 text-sm text-slate-500">登入以管理商品、訂單與店鋪設定</p>
        </div>
        <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="space-y-4">
            <Field label="Email" required>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="密碼" required>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </Field>
            {error && (
              <div role="alert" className="rounded-md border border-danger-600/20 bg-danger-50 px-3 py-2 text-[13px] text-danger-700">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              登入
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">示範帳號：admin@es.local / admin1234</p>
        </form>
      </div>
    </main>
  );
}
