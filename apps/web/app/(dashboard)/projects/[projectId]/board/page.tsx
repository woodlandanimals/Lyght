import { prisma } from "@/lib/prisma";
import { BoardView } from "@/components/board/board-view";

const COLUMNS = [
  { id: "triage", label: "TRIAGE" },
  { id: "planning", label: "PLANNING" },
  { id: "ready", label: "READY" },
  { id: "in_progress", label: "SWARMING" },
  { id: "in_review", label: "REVIEW" },
  { id: "done", label: "DONE" },
];

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return <div className="text-lyght-grey-500">Project not found</div>;

  const issues = await prisma.issue.findMany({
    where: { projectId },
    orderBy: { number: "asc" },
  });

  const columns = COLUMNS.map((col) => ({
    ...col,
    issues: issues.filter((i) => {
      if (col.id === "in_progress") return i.status === "in_progress" || i.status === "swarming";
      if (col.id === "planning") return i.status === "planning" || i.status === "planned";
      return i.status === col.id;
    }),
  }));

  return (
    <div>
      <h1 className="text-[20px] font-mono font-bold text-lyght-black mb-6">BOARD</h1>
      <BoardView columns={columns} projectKey={project.key} projectId={projectId} />
    </div>
  );
}
