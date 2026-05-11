import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { authApi } from '@/shared/api/api-legacy';
import { updateUser } from '@/shared/lib/storeActions';
import { useAppDispatch, useAppSelector } from '@/shared/lib/storeHooks';

/**
 * Avatar picker for the Settings page.
 *
 * The image is read in the browser, resized to 256x256 with a centered crop,
 * encoded as a JPEG data URL, and sent to the backend through PATCH /auth/profile.
 */
const SIZE = 256;
const MAX_FILE_BYTES = 6 * 1024 * 1024;

const previewBase = tw`w-24 h-24 rounded-full object-cover bg-bg3 border-2 border-border2`;

export function AvatarUpload() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.avatar.notImage'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(t('settings.avatar.tooLarge'));
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file, SIZE);
      const { data } = await authApi.patchProfile({ avatarUrl: dataUrl });
      dispatch(updateUser(data));
      toast.success(t('settings.avatar.saved'));
    } catch {
      toast.error(t('settings.avatar.failed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await authApi.patchProfile({ avatarUrl: '' });
      dispatch(updateUser(data));
      toast.success(t('settings.avatar.removed'));
    } catch {
      toast.error(t('settings.avatar.failed'));
    } finally {
      setBusy(false);
    }
  };

  const initial = (user.displayName || user.username || 'U')[0].toUpperCase();

  return (
    <div className='flex flex-col items-start gap-3.5'>
      <div className='flex items-center justify-center'>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt='' className={previewBase} />
        ) : (
          <div
            className={cn(
              previewBase,
              'font-display from-brand to-accent flex items-center justify-center bg-gradient-to-br text-[38px] font-extrabold text-white',
            )}
          >
            {initial}
          </div>
        )}
      </div>

      <div className='flex flex-wrap gap-2.5'>
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type='button'
          className='btn btn-primary btn-sm'
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t('common.loading') : t('settings.avatar.upload')}
        </button>
        {user.avatarUrl && (
          <button
            type='button'
            className='btn btn-ghost btn-sm'
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            {t('settings.avatar.remove')}
          </button>
        )}
      </div>

      <p className='text-text3 m-0 text-xs leading-[1.5]'>
        {t('settings.avatar.hint')}
      </p>
    </div>
  );
}

function fileToSquareDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image decode error'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        const src = Math.min(img.width, img.height);
        const sx = (img.width - src) / 2;
        const sy = (img.height - src) / 2;
        ctx.drawImage(img, sx, sy, src, src, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
