interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-lyght-grey-300/20 px-4 py-12 text-center">
      <h3 className="text-[14px] font-mono text-lyght-grey-500 mb-2">{title}</h3>
      {description && (
        <p className="text-[12px] font-mono text-lyght-grey-700 mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
