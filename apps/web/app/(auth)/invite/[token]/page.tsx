"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InvitationData {
  email: string;
  organizationName: string;
  status: string;
  expired: boolean;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [needsRegistration, setNeedsRegistration] = useState(false);

  // Registration fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok && data.userId) {
          // Existing user was auto-accepted
          router.push("/");
          return;
        }

        if (data.needsRegistration) {
          setNeedsRegistration(true);
          // Fetch invitation details for display
          const detailRes = await fetch(`/api/invitations/details?token=${encodeURIComponent(token)}`);
          if (detailRes.ok) {
            const details = await detailRes.json();
            setInvitation(details);
          }
        } else {
          setError(data.error || "Invalid invitation");
        }
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token, router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setSubmitting(false);
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 items-center">
        <span className="inline-block w-5 h-5 border-2 border-lyght-orange border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-lyght-grey-500 font-mono">Verifying invitation...</p>
      </div>
    );
  }

  if (error && !needsRegistration) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
            INVITATION
          </h1>
        </div>
        <div className="text-[13px] text-lyght-red font-mono bg-lyght-red/5 border border-lyght-red/20 rounded-md px-3 py-2">
          {error}
        </div>
        <Button variant="secondary" onClick={() => router.push("/login")} className="w-full">
          GO TO SIGN IN
        </Button>
      </div>
    );
  }

  if (needsRegistration) {
    return (
      <form onSubmit={handleRegister} className="flex flex-col gap-8">
        <div>
          <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
            JOIN {invitation?.organizationName?.toUpperCase() || "ORGANIZATION"}
          </h1>
          <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
            Create your account to accept the invitation.
          </p>
        </div>

        {error && (
          <div className="text-[13px] text-lyght-red font-mono bg-lyght-red/5 border border-lyght-red/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" loading={submitting} disabled={!name.trim() || password.length < 8} className="w-full">
          JOIN ORGANIZATION
        </Button>
      </form>
    );
  }

  return null;
}
