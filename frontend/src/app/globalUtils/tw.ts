import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

if (!globalThis.cn) {
  globalThis.cn = (...inputs) => twMerge(clsx(inputs));
}

if (!globalThis.tw) {
  globalThis.tw = (strings: TemplateStringsArray, ...values: AnyArray) =>
    String.raw({ raw: strings }, ...values);
}
