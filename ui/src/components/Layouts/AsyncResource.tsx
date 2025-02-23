import { useComputed, useSignal } from "@preact/signals";
import { Loading } from "./Loading";
import { ErrorBoundary } from "./ErrorBoundary";
import { CustomComponent } from "../../utilities/component.utils";

export function useAsyncResource() {
  const isLoading = useSignal(false);
  const error = useSignal('');
  const hasError = useComputed(() => Boolean(error.value));

  return ({
    isLoading,
    hasError,
    execute: async <T extends unknown>(resourceRequest: Promise<T>): Promise<T | undefined> => {
      isLoading.value = true;
      error.value = '';
      
      return resourceRequest
        .catch((reason) => {
          error.value = 'Error Loading Resource: ' + reason;
          return undefined;
        })
        .finally(() => {
          isLoading.value = false;
        });
    },
    Provider: ({ children }: CustomComponent) => (
      <Loading isLoading={isLoading}>
        <ErrorBoundary hasError={hasError} message={error.value}>
          {children}
        </ErrorBoundary>
      </Loading>
    )
  });
}
