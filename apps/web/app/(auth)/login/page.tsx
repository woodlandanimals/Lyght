"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (data.firstProjectId) {
        router.push(`/projects/${data.firstProjectId}/issues`);
      } else {
        router.push("/");
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div>
        <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
          SIGN IN
        </h1>
        <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
          Welcome back to Lyght.
        </p>
      </div>

      {error && (
        <div className="text-[13px] text-lyght-red font-mono bg-lyght-red/5 border border-lyght-red/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" loading={loading} disabled={!email.trim() || !password} className="w-full">
        SIGN IN
      </Button>

      <p className="text-[13px] text-lyght-grey-500 font-mono text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-lyght-orange hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
