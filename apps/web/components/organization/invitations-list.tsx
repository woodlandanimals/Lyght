"use client";

import { Button } from "@/components/ui/button";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
  invitedBy: {
    name: string;
    email: string;
  };
}

interface InvitationsListProps {
  invitations: Invitation[];
  onRevoke: (id: string) => void;
}

export function InvitationsList({ invitations, onRevoke }: InvitationsListProps) {
  const pending = invitations.filter((i) => i.status === "pending");

  if (pending.length === 0) {
    return null;
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="flex flex-col">
      <div className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono mb-2">
        Pending Invitations ({pending.length})
      </div>
      <div className="border border-lyght-grey-300/20 rounded-lg divide-y divide-lyght-grey-300/20">
        {pending.map((inv) => {
          const isExpired = new Date() > new Date(inv.expiresAt);

          return (
            <div
              key={inv.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <div className="text-[13px] font-mono text-lyght-black">
                  {inv.email}
                </div>
                <div className="text-[11px] font-mono text-lyght-grey-500">
                  {isExpired ? "Expired" : `Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  {" \u00B7 "}{inv.role}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleCopyLink(inv.token)}>
                  COPY LINK
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRevoke(inv.id)}>
                  REVOKE
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
