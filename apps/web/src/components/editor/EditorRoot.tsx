'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { startAnalytics } from '@/lib/analytics';
import { isMobileViewport } from '@/lib/motion';
import { useEditor } from '@/lib/store';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { PageInput } from '../landing/PageInput';
import { Toast } from './Toast';
import { useBackgroundImage } from './useEditorEffects';

// Each of these is its own chunk, loaded only when it is on screen.
const Editor = dynamic(() => import('./Editor').then((m) => m.Editor), { ssr: false, loading: () => <EditorPlaceholder /> });
const MobileEditor = dynamic(() => import('../mobile/MobileEditor').then((m) => m.MobileEditor), { ssr: false });
const DownloadSheet = dynamic(() => import('../mobile/DownloadSheet').then((m) => m.DownloadSheet), { ssr: false });
const ShareDialog = dynamic(() => import('./ShareDialog').then((m) => m.ShareDialog), { ssr: false });
const ShortcutsDialog = dynamic(() => import('./ShortcutsDialog').then((m) => m.ShortcutsDialog), { ssr: false });

function EditorPlaceholder() {
  return <div aria-hidden="true" className="glass-panel min-h-[760px] rounded-shell" />;
}

/** Client island: the desktop editor plus everything page-wide (paste/drop, toasts, dialogs, mobile editor). */
export function EditorRoot() {
  useBackgroundImage();
  const [mounted, setMounted] = useState(false);
  const desktop = useMediaQuery('(min-width: 768px)');
  const mobileOpen = useEditor((s) => s.mobileEditorOpen);
  const sheetOpen = useEditor((s) => s.downloadSheetOpen);
  const shareOpen = useEditor((s) => s.share.kind !== 'closed');
  const shortcutsOpen = useEditor((s) => s.shortcutsOpen);

  useEffect(() => {
    // /#editor on a phone opens the mobile editor directly.
    if (location.hash === '#editor' && isMobileViewport()) {
      history.replaceState(null, '', location.pathname);
      history.pushState({ weshotEditor: true }, '', '#editor');
      useEditor.getState().setMobileEditorOpen(true);
    }
    if (process.env.NEXT_PUBLIC_E2E === '1') void import('@/lib/test-hooks').then((m) => m.installTestHooks());
    startAnalytics();
    setMounted(true);
  }, []);

  return (
    <>
      {desktop ? <Editor /> : null}
      {/* Page-wide layers live at the body level, outside the editor section's stacking context. */}
      {mounted
        ? createPortal(
            <>
              <PageInput />
              {mobileOpen ? <MobileEditor /> : null}
              {sheetOpen ? <DownloadSheet /> : null}
              {shortcutsOpen ? <ShortcutsDialog /> : null}
              {shareOpen ? <ShareDialog /> : null}
              <Toast />
            </>,
            document.body,
          )
        : null}
    </>
  );
}
