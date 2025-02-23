import { Signal } from "@preact/signals";
import { CustomComponent } from "../../utilities/component.utils";

export function ErrorBoundary({ hasError, children, message }: CustomComponent<{ hasError: Signal<boolean>, message: string | (() => string) }>) {
  if (hasError.value) {
    const msg = typeof message === 'string' ? message : message();

    return (
      <div className="w-full border-red-600 bg-red-200 text-red-600 rounded p-4">
        <p>{msg}</p>
      </div>
    );
  }

  return children;
};