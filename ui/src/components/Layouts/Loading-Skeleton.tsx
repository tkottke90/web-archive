import { Signal, useComputed } from "@preact/signals";
import { compoundClass, CustomComponent } from "../../utilities/component.utils";
import { useLoadingContext } from "./Loading";

interface LoadingSkeletonProps extends CustomComponent {
  isLoading?: Signal<boolean>
}

export function LoadingSkeleton({ children, isLoading }: LoadingSkeletonProps) {
  const innerLoader = isLoading ?? new Signal(false);
  const LoadingContext = useLoadingContext()

  const showLoading = useComputed(() => {
    // Assigning a Signal directly to the component is the highest priority
    if (isLoading) {
      return innerLoader.value;
    }

    // If no direct assignment, check for a context window
    // that we can pull from
    if (LoadingContext?.isLoading) {
      return LoadingContext.isLoading.value;
    }

    // Otherwise use the inner window
    return innerLoader.value;
  });

  return (
    <span className={compoundClass('', { 'text-transparent bg-slate-400 rounded-2xl': showLoading.value })}>
      {children}
    </span>
  )
}