import React from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: AvatarSize;
  /** Dot indicator color, e.g. 'bg-green-500' */
  statusColor?: string;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { wrapper: string; text: string }> = {
  xs: { wrapper: 'w-6 h-6',   text: 'text-[10px]' },
  sm: { wrapper: 'w-9 h-9',   text: 'text-xs' },
  md: { wrapper: 'w-11 h-11', text: 'text-sm' },
  lg: { wrapper: 'w-14 h-14', text: 'text-lg' },
  xl: { wrapper: 'w-20 h-20', text: 'text-2xl' },
};

// Deterministic color from name — same palette as locataireUtils.
const COLORS = [
  'bg-teal-500', 'bg-green-500', 'bg-blue-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-violet-500', 'bg-red-500',
];
function colorFromName(name = ''): string {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length] ?? 'bg-teal-500';
}

function initials(name = ''): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 'md',
  statusColor,
  className = '',
}) => {
  const { wrapper, text } = SIZE_CLASSES[size];
  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div className={`${wrapper} rounded-full overflow-hidden flex items-center justify-center ring-2 ring-base-100 ${imageUrl ? '' : colorFromName(name)}`}>
        {imageUrl
          ? <img src={imageUrl} alt={name ?? ''} className="w-full h-full object-cover" />
          : <span className={`text-white font-bold ${text}`}>{initials(name)}</span>
        }
      </div>
      {statusColor && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-base-100 ${statusColor}`} />
      )}
    </div>
  );
};

export default Avatar;
