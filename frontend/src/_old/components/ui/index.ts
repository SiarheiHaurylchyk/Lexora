/**
 * Shared UI building blocks.
 * Re-exporting from a single file lets pages import them with one short line:
 *   import { Button, Modal, TextInput } from '../components/ui';
 */
export { default as Button } from './Button';
export { default as IconButton } from './IconButton';
export { default as TextInput } from './TextInput';
export { default as TextArea } from './TextArea';
export { default as Modal } from './Modal';
export { default as Spinner } from './Spinner';
export { default as Skeleton } from './Skeleton';
export { default as Avatar } from './Avatar';
export { default as EmptyState } from './EmptyState';
export { default as SectionCard } from './SectionCard';
export { default as PageHeader } from './PageHeader';
export { ConfirmProvider, useConfirm } from './ConfirmProvider';
export type { ConfirmOptions } from './ConfirmProvider';
export { TooltipProvider, SidebarItemTooltip } from './LexTooltip';
