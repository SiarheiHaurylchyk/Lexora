import React from 'react';
import { Avatar } from '../ui';

/**
 * PersonRow — one row that shows a single user (avatar, name, email)
 * and an optional action button on the right.
 *
 * Used in the "My Students" page and in the share dialog.
 */
interface Props {
  name: string;
  email?: string;
  avatarUrl?: string;
  /** Small pill shown next to the name (for example, "Teacher"). */
  badgeText?: string;
  /** Right-side action like a "remove" button. */
  action?: React.ReactNode;
  onClick?: () => void;
}

export default function PersonRow({ name, email, avatarUrl, badgeText, action, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Avatar name={name} src={avatarUrl} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{name}</span>
          {badgeText && <span className="badge badge-brand">{badgeText}</span>}
        </div>
        {email && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
