import { redirect } from "next/navigation";

export default async function PlanReviewPage({
  params,
}: {
  params: Promise<{ projectId: string; issueId: string }>;
}) {
  const { projectId, issueId } = await params;

  // Plan review is now inline in the issue detail chat — redirect there
  redirect(`/projects/${projectId}/issues/${issueId}`);
}
