"use client";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface MembersListProps {
  members: Member[];
}

export function MembersList({ members }: MembersListProps) {
  return (
    <div className="flex flex-col">
      <div className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 font-mono mb-2">
        Members ({members.length})
      </div>
      <div className="border border-lyght-grey-300/20 rounded-lg divide-y divide-lyght-grey-300/20">
        {members.map((member) => {
          const initials = member.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-lyght-orange/10 text-lyght-orange text-[11px] font-mono font-bold flex items-center justify-center">
                  {initials}
                </div>
                <div>
                  <div className="text-[13px] font-mono text-lyght-black">
                    {member.user.name}
                  </div>
                  <div className="text-[11px] font-mono text-lyght-grey-500">
                    {member.user.email}
                  </div>
                </div>
              </div>
              <span className="text-[11px] uppercase tracking-[0.1em] font-mono text-lyght-grey-500 bg-lyght-grey-100 px-2 py-0.5 rounded-full">
                {member.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
