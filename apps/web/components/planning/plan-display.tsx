"use client";

interface PlanDisplayProps {
  plan: string;
}

interface CodingPlan {
  objective?: string;
  approach?: string;
  tasks?: {
    id: string;
    title: string;
    description: string;
    filesToModify?: string[];
    filesToCreate?: string[];
    dependsOn?: string[];
    verification?: string;
    estimateMinutes?: number;
  }[];
  agentPrompt?: string;
  risks?: string[];
  totalEstimateMinutes?: number;
}

export function PlanDisplay({ plan }: PlanDisplayProps) {
  let parsed: CodingPlan | null = null;
  try {
    parsed = JSON.parse(plan);
  } catch {
    // Not JSON, show as raw text
  }

  if (!parsed) {
    return (
      <div className="text-[13px] text-lyght-grey-500 font-mono whitespace-pre-wrap">
        {plan}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {parsed.objective && (
        <Section title="OBJECTIVE">
          <p className="text-[13px] text-lyght-grey-500">{parsed.objective}</p>
        </Section>
      )}

      {parsed.approach && (
        <Section title="APPROACH">
          <p className="text-[13px] text-lyght-grey-500">{parsed.approach}</p>
        </Section>
      )}

      {parsed.tasks && parsed.tasks.length > 0 && (
        <Section title={`TASKS (${parsed.tasks.length})`}>
          <div className="flex flex-col gap-3">
            {parsed.tasks.map((task, i) => (
              <div key={task.id || i} className="border border-lyght-grey-300/10 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-lyght-orange font-mono">{task.id}</span>
                  <span className="text-[13px] text-lyght-black font-mono">{task.title}</span>
                  {task.estimateMinutes && (
                    <span className="text-[11px] text-lyght-grey-500 ml-auto">{task.estimateMinutes}m</span>
                  )}
                </div>
                <p className="text-[12px] text-lyght-grey-500 mb-2">{task.description}</p>
                {task.filesToCreate && task.filesToCreate.length > 0 && (
                  <div className="text-[11px] text-lyght-green font-mono">+ {task.filesToCreate.join(", ")}</div>
                )}
                {task.filesToModify && task.filesToModify.length > 0 && (
                  <div className="text-[11px] text-lyght-yellow font-mono">~ {task.filesToModify.join(", ")}</div>
                )}
                {task.dependsOn && task.dependsOn.length > 0 && (
                  <div className="text-[11px] text-lyght-grey-500">depends: {task.dependsOn.join(", ")}</div>
                )}
                {task.verification && (
                  <div className="text-[11px] text-lyght-blue mt-1">verify: {task.verification}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {parsed.risks && parsed.risks.length > 0 && (
        <Section title="RISKS">
          <ul className="text-[12px] text-lyght-yellow">
            {parsed.risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span>!</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {parsed.totalEstimateMinutes && (
        <div className="text-[11px] text-lyght-grey-500 font-mono">
          TOTAL ESTIMATE: {parsed.totalEstimateMinutes} minutes
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500 mb-2 font-mono">
        {title}
      </h3>
      {children}
    </div>
  );
}
