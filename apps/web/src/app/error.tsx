"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-xl font-semibold">發生了一點問題</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">{error.message || "請稍後再試一次。"}</p>
      <Button className="mt-6" onClick={reset}>
        重新載入
      </Button>
    </div>
  );
}
