import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactElement } from 'react';
import styles from './LexTooltip.module.css';

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={320} skipDelayDuration={200}>
      {children}
    </Tooltip.Provider>
  );
}

type SidebarItemTooltipProps = {
  label: string;
  enabled: boolean;
  children: ReactElement;
};

export function SidebarItemTooltip({ label, enabled, children }: SidebarItemTooltipProps) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={styles.content} side="right" sideOffset={10}>
          {label}
          <Tooltip.Arrow className={styles.arrow} width={10} height={5} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
