import type { ClassValue } from 'clsx';

/* eslint-disable @typescript-eslint/no-explicit-any -- these aliases intentionally wrap `any` for convenience escape-hatches. */

declare global {
  type Any = any;
  type AnyArray<T = any> = Array<T>;
  type AnyObject = Record<string, any>;
  type AnyRecord = Record<any, any>;
  type AnyFunction = (...args: any[]) => any;

  function cn(...inputs: ClassValue[]): string;
  function tw(strings: TemplateStringsArray, ...values: AnyArray): string;
}

export {};
