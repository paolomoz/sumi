import { TaskPage } from "@/components/task/task-page";

export default async function TaskRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskPage jobId={id} />;
}
