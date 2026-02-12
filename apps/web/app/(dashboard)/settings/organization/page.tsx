"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MembersList } from "@/components/organization/members-list";
import { InvitationsList } from "@/components/organization/invitations-list";
import { InviteMemberModal } from "@/components/organization/invite-member-modal";

interface OrgMember {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
  invitedBy: { name: string; email: string };
}

export default function OrganizationSettingsPage() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch("/api/organization/members"),
        fetch("/api/invitations"),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRevoke(invitationId: string) {
    await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="inline-block w-5 h-5 border-2 border-lyght-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[20px] font-mono font-bold text-lyght-black">
          ORGANIZATION
        </h1>
        <Button onClick={() => setInviteModalOpen(true)}>
          INVITE MEMBER
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        <MembersList members={members} />
        <InvitationsList invitations={invitations} onRevoke={handleRevoke} />
      </div>

      <InviteMemberModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvited={fetchData}
      />
    </div>
  );
}
