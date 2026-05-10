/** Placeholder routes for `replacePathId`; extend when wiring pages */
export const ID_TEMPLATE = ':id';

export const AppRouter = {
  exampleDetail: `/example/${ID_TEMPLATE}`,
} as const;
