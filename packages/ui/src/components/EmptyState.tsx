export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon ?? <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
        <span className="text-2xl">🔍</span>
      </div>}
      <p className="text-xl font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-neutral-400 max-w-md">{description}</p>
    </div>
  );
}
