import { createContext } from 'preact';
import { createPortal } from 'preact/compat';
import { useContext } from 'preact/hooks';
import { type ComponentChildren } from 'preact';
import { toast, type ExternalToast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { getPortalContainer } from '@/utilities/component.utils';

const toastPortal = getPortalContainer('toastPortal');

export type ToastTracker = {
  success: (message: string) => void;
  failure: (message: string, retryFn?: () => void) => FailureTracker;
};

export type FailureTracker = {
  retry: () => ToastTracker;
};

function makeTracker(currentId: string | number, pendingMessage: string): ToastTracker {
  return {
    success(message) {
      toast.dismiss(currentId);
      toast.success(message, { duration: 3000 });
    },
    failure(message, retryFn) {
      toast.dismiss(currentId);
      let failureId: string | number;

      const retry = (): ToastTracker => {
        toast.dismiss(failureId);
        const newId = toast.loading(pendingMessage);
        return makeTracker(newId, pendingMessage);
      };

      failureId = toast.error(message, {
        duration: Infinity,
        ...(retryFn && { action: { label: 'Retry', onClick: retryFn } }),
      });

      return { retry };
    },
  };
}

type ToastContextValue = {
  success: (message: string, options?: ExternalToast) => void;
  error: (message: string, options?: ExternalToast) => void;
  loading: (message: string, options?: ExternalToast) => string | number;
  info: (message: string, options?: ExternalToast) => void;
  dismiss: (id?: string | number) => void;
  createToastTracker: (message: string, options?: ExternalToast) => ToastTracker;
};

const defaultContext: ToastContextValue = {
  success: () => {},
  error: () => {},
  loading: () => '',
  info: () => {},
  dismiss: () => {},
  createToastTracker: (message) => makeTracker(toast.loading(message), message),
};

const ToastContext = createContext<ToastContextValue>(defaultContext);

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const value: ToastContextValue = {
    success: (message, options) => toast.success(message, options),
    error: (message, options) => toast.error(message, options),
    loading: (message, options) => toast.loading(message, options),
    info: (message, options) => toast(message, options),
    dismiss: (id) => toast.dismiss(id),
    createToastTracker: (message, options) => {
      const id = toast.loading(message, options);
      return makeTracker(id, message);
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(<Toaster />, toastPortal)}
    </ToastContext.Provider>
  );
}

export function useToaster() {
  return useContext(ToastContext);
}
