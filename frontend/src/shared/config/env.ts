/** Vite env; mirrors NEXT_PUBLIC_* naming used by migrated API layer */
export const env = {
  NEXT_PUBLIC_API_URL:
    (import.meta.env.VITE_API_URL as string | undefined) ?? '',
};
