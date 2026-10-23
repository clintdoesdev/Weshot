'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isMobileViewport } from '@/lib/motion';
import { useEditor } from '@/lib/store';
import { installTestHooks } from '@/lib/test-hooks';
import { PageInput } from '../landing/PageInput';
import { DownloadSheet } from '../mobile/DownloadSheet';
import { MobileEditor } from '../mobile/MobileEditor';
import { Editor } from './Editor';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Toast } from './Toast';
import { useBackgroundImage } from './useEditorEffects';

/** Client island: the desktop editor plus everything page-wide (paste/drop, toasts, dialogs, mobile editor). */
export function EditorRoot() {
  useBackgroundImage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // /#editor on a phone opens the mobile editor directly.
    if (location.hash === '#editor' && isMobileViewport()) {
      history.replaceState(null, '', location.pathname);
      history.pushState({ weshotEditor: true }, '', '#editor');
      useEditor.getState().setMobileEditorOpen(true);
    }
    installTestHooks();
    setMounted(true);
  }, []);
  return (
    <>
      <div className="hidden md:block">
        <Editor />
      </div>
      {/* Page-wide layers live at the body level, outside the editor section's stacking context. */}
      {mounted
        ? createPortal(
            <>
              <PageInput />
              <MobileEditor />
              <DownloadSheet />
              <ShortcutsDialog />
              <Toast />
            </>,
            document.body,
          )
        : null}
    </>
  );
}
