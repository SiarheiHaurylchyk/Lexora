import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** Optional content rendered fixed in the top-right corner (e.g. language switcher). */
  headerSlot?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  headerSlot,
  children,
}: AuthLayoutProps) {
  return (
    <div className='bg-bg relative flex min-h-screen items-center justify-center p-6'>
      {headerSlot && (
        <div className='fixed top-5 right-6 z-10'>{headerSlot}</div>
      )}
      <div className='pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(124,58,237,0.1)_0%,transparent_60%),radial-gradient(ellipse_at_70%_70%,rgba(6,182,212,0.07)_0%,transparent_60%)]' />

      <div className='animate-scale relative w-full max-w-[460px]'>
        <div className='mb-10 text-center'>
          <Link to='/' className='inline-flex items-center gap-2.5'>
            <div className='from-brand to-accent flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br text-[22px]'>
              ✦
            </div>
            <span className='font-display text-2xl font-extrabold'>Lexora</span>
          </Link>
        </div>

        <div className='card p-10'>
          <h1 className='mb-2 text-center text-[28px]'>{title}</h1>
          <p className='text-text2 mb-8 text-center text-[15px]'>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
