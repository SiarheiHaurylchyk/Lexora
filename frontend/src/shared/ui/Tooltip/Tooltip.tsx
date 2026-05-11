import type { ReactElement, ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={320} skipDelayDuration={200}>
      {children}
    </Tooltip.Provider>
  );
}

interface SidebarItemTooltipProps {
  label: string;
  enabled: boolean;
  children: ReactElement;
}

export function SidebarItemTooltip({
  label,
  enabled,
  children,
}: SidebarItemTooltipProps) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className='border-border2 bg-bg3 text-text z-[4800] max-w-[240px] rounded-[10px] border px-2.5 py-1.5 text-xs leading-[1.35] font-semibold shadow-[var(--shadow)]'
          side='right'
          sideOffset={10}
        >
          {label}
          <Tooltip.Arrow className='fill-bg3' width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
