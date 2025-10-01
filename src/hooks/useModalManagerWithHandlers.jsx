import { useState, useCallback } from 'react';

export default function useModalManagerWithHandlers(handlers = {}) {
  const [modal, setModal] = useState({ mode: null, payload: null });

  const open = useCallback(
    (mode, payload = null) => {
      setModal({ mode, payload });
      const handler = handlers[mode];
      if (typeof handler === 'function') handler(payload);
    },
    [handlers]
  );

  const close = useCallback(() => {
    setModal({ mode: null, payload: null });
    if (typeof handlers.onClose === 'function') handlers.onClose();
  }, [handlers]);

  return {
    modal,
    open,
    close,
    mode: modal.mode,
    payload: modal.payload,
    isOpen: modal.mode !== null,
  };
}
