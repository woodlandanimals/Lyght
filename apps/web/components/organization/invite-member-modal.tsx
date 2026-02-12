"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ open, onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInviteUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create invitation");
        setLoading(false);
        return;
      }

      const fullUrl = `${window.location.origin}${data.inviteUrl}`;
      setInviteUrl(fullUrl);
      setLoading(false);
      onInvited();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
  }

  function handleClose() {
    setEmail("");
    setRole("member");
    setError("");
    setInviteUrl("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite Member">
      {inviteUrl ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] font-mono text-lyght-grey-700">
            Share this link with <span className="text-lyght-black font-semibold">{email}</span>:
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 bg-lyght-grey-100 border border-lyght-grey-300/40 rounded-md text-[12px] font-mono text-lyght-grey-700 py-2 px-3"
            />
            <Button size="sm" onClick={handleCopy}>
              COPY
            </Button>
          </div>
          <p className="text-[11px] text-lyght-grey-500 font-mono">
            This link expires in 7 days.
          </p>
          <Button variant="secondary" onClick={handleClose} className="w-full">
            DONE
          </Button>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          {error && (
            <div className="text-[13px] text-lyght-red font-mono bg-lyght-red/5 border border-lyght-red/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <Input
            label="Email Address"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-transparent border border-lyght-grey-300/40 rounded-md text-lyght-black font-mono text-[14px] py-2 px-3 outline-none focus:border-lyght-orange focus:ring-1 focus:ring-lyght-orange/20"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={handleClose} className="flex-1">
              CANCEL
            </Button>
            <Button type="submit" loading={loading} disabled={!email.trim()} className="flex-1">
              SEND INVITE
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
