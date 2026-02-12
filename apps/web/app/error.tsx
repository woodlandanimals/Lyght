"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-lyght-white flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="text-[28px] font-mono font-bold text-lyght-red mb-4">ERROR</div>
        <p className="text-[14px] text-lyght-grey-500 font-mono mb-6">
          {error.message || "Something went wrong."}
        </p>
        <Button onClick={reset}>TRY AGAIN</Button>
      </div>
    </div>
  );
}
