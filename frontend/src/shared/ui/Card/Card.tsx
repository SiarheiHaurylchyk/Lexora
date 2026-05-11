import {
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  interactive?: boolean;
  children?: ReactNode;
}

const baseClasses = tw`bg-surface border border-border rounded-[20px] p-6`;
const interactiveClasses = tw`transition-colors duration-200 hover:border-border2`;

export const Card = forwardRef<HTMLElement, CardProps>(
  (
    { as: Tag = 'div', interactive = false, className, children, ...rest },
    ref,
  ) => {
    const Component = Tag as ElementType;
    return (
      <Component
        ref={ref}
        className={cn(
          baseClasses,
          interactive && interactiveClasses,
          className,
        )}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

Card.displayName = 'Card';
