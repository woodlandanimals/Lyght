import { prisma } from "@/lib/prisma";
import { BoardView } from "@/components/board/board-view";
import { BOARD_COLUMNS } from "@/lib/statuses";

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
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      planStatus: true,
      swarmId: true,
    },
  });

  const columns = BOARD_COLUMNS.map((col) => ({
    ...col,
    issues: issues.filter((i) => i.status === col.id),
  }));

  return (
    <div>
      <h1 className="text-[20px] font-mono font-bold text-lyght-black mb-6">BOARD</h1>
      <BoardView columns={columns} projectKey={project.key} projectId={projectId} />
    </div>
  );
}
