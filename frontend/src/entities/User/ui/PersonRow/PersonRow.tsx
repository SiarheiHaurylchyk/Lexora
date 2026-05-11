import type { ReactNode } from 'react';
import { Avatar } from '@ui';

interface Props {
  name: string;
  email?: string;
  avatarUrl?: string;
  /** Small pill shown next to the name (for example, "Teacher"). */
  badgeText?: string;
  /** Right-side action like a "remove" button. */
  action?: ReactNode;
  onClick?: () => void;
}

/**
 * PersonRow — one row that shows a single user (avatar, name, email)
 * and an optional action button on the right.
 */
export function PersonRow({
  name,
  email,
  avatarUrl,
  badgeText,
  action,
  onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'border-border bg-surface mb-2 flex items-center gap-3 rounded-[12px] border px-4 py-3',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <Avatar name={name} src={avatarUrl} size={40} />
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-[15px] font-semibold'>{name}</span>
          {badgeText && <span className='badge badge-brand'>{badgeText}</span>}
        </div>
        {email && (
          <div className='text-text3 overflow-hidden text-[13px] text-ellipsis whitespace-nowrap'>
            {email}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
