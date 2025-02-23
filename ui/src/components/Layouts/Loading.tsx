import { Signal } from "@preact/signals";
import { CustomComponent } from "../../utilities/component.utils";

export function Loading({ isLoading, children }: CustomComponent<{ isLoading: Signal<boolean> }>) {
  return (
    <div className="col-span-2">
      {isLoading.value && <p className="p-4 text-center text-xl">Loading...</p>}
      {!isLoading.value && children}
    </div>
  );
};