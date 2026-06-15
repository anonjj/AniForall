import { InboxIcon } from '@heroicons/react/24/outline';

export default function EmptyState({ message, description, icon: CustomIcon }) {
  const Icon = CustomIcon || InboxIcon;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-zinc-800/40 border border-white/5 flex items-center justify-center mb-6 text-zinc-500">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {message || 'No items found'}
      </h3>
      {description && (
        <p className="text-zinc-500 text-sm max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}
