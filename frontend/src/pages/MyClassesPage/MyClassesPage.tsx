import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

import { ClassCard } from '@/entities/Classroom';

import type { StudentLink } from '@/shared/api/types';
import { userCanTeach } from '@/shared/lib/accountRole';
import { useApiQuery } from '@/shared/lib/query';
import { useAuthStore } from '@/shared/lib/storeHooks';

const gridClasses = tw`grid gap-[22px] grid-cols-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1`;

function matchesQuery(link: StudentLink, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const u = link.user;
  return (
    (u.displayName?.toLowerCase().includes(n) ?? false) ||
    u.username.toLowerCase().includes(n) ||
    (u.email?.toLowerCase().includes(n) ?? false) ||
    String(link.linkId).includes(n)
  );
}

/**
 * Grid of shared classrooms (teacher ↔ student), same entry point for both roles.
 */
export function MyClassesPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const canTeach = userCanTeach(me?.role);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 280);
    return () => window.clearTimeout(id);
  }, [q]);

  const itemsQuery = useApiQuery<StudentLink[]>({
    queryKey: ['classes', canTeach ? 'students' : 'teachers'],
    url: canTeach ? '/students/my-students' : '/students/my-teachers',
  });
  const items = itemsQuery.data ?? [];
  const loading = itemsQuery.isLoading;
  useEffect(() => {
    if (itemsQuery.isError) toast.error(t('classes.loadFailed'));
  }, [itemsQuery.isError, t]);

  const filtered = useMemo(
    () => items.filter((row) => matchesQuery(row, qDebounced)),
    [items, qDebounced],
  );

  const peerRole = canTeach ? 'student' : 'teacher';

  return (
    <div className='box-border w-full py-10'>
      <div className='mb-9 text-center'>
        <h1 className='font-display mb-2.5 text-[clamp(28px,4vw,40px)] tracking-[-0.02em]'>
          {t('classes.title')}
        </h1>
        <p className='text-text2 mx-auto max-w-[620px] text-base leading-[1.55]'>
          {canTeach
            ? t('classes.subtitleTeacher')
            : t('classes.subtitleLearner')}
        </p>
      </div>

      <div className='mb-5 flex flex-wrap items-center gap-3.5'>
        <div className='relative min-w-[220px] flex-1'>
          <Search
            size={18}
            strokeWidth={2}
            className='text-text3 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2'
            aria-hidden
          />
          <input
            className='input-field w-full pl-11'
            placeholder={t('classes.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('classes.searchPlaceholder')}
          />
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <p className='text-text3 mb-4 text-sm'>
          {t('classes.found', { count: filtered.length })}
        </p>
      )}

      {loading ? (
        <div className={gridClasses}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='skeleton h-[380px] rounded-[20px]' />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='px-6 py-[72px] text-center'>
          <div className='mb-3.5 text-[52px]'>🎓</div>
          <h2 className='font-display mb-2.5 text-[22px]'>
            {t('classes.emptyTitle')}
          </h2>
          <p className='text-text2 mx-auto mb-5 max-w-[440px] leading-[1.5]'>
            {items.length === 0
              ? canTeach
                ? t('classes.emptyHelpTeacherZero')
                : t('classes.emptyHelpLearnerZero')
              : t('classes.emptyHelpSearch')}
          </p>
          {items.length === 0 && !canTeach && (
            <Link to='/teachers' className='btn btn-primary'>
              {t('classes.findTeachers')}
            </Link>
          )}
          {items.length === 0 && canTeach && (
            <Link to='/students' className='btn btn-primary'>
              {t('students.addFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className={gridClasses}>
          {filtered.map((link) => (
            <ClassCard key={link.linkId} link={link} peerRole={peerRole} />
          ))}
        </div>
      )}

      {canTeach && (
        <div className='border-border mt-7 flex flex-wrap justify-center gap-4 border-t pt-5'>
          <Link
            to='/students'
            className='text-brand-light text-sm font-semibold no-underline hover:underline'
          >
            {t('classes.manageRoster')} →
          </Link>
        </div>
      )}
    </div>
  );
}
