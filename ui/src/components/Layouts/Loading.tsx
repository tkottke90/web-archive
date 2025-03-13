import { Signal } from "@preact/signals";
import { CustomComponent } from "../../utilities/component.utils";
import { createContext } from "preact";
import { useContext } from "preact/hooks";

const loadingContext = createContext({
  isLoading: new Signal(false)
})

export function useLoadingContext() {
  return useContext(loadingContext);
}

export function Loading({ isLoading, children }: CustomComponent<{ isLoading: Signal<boolean> }>) {
  return (
    <loadingContext.Provider value={{ isLoading }}>
      <div className="col-span-2">
        {isLoading.value && <p className="p-4 text-center text-xl">Loading...</p>}
        {!isLoading.value && children}
      </div>
    </loadingContext.Provider>
  );
};