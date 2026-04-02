import { X } from "lucide-preact";
import { ComponentChildren } from "preact";

export function Tag({children, hideRemove, onRemove }: { children: ComponentChildren, hideRemove?: boolean, onRemove?: () => void }) {
  return (
    <span className="rounded-full bg-crown-300 px-2 py-1 whitespace-nowrap font-bold text-sm flex gap-px items-center">
      {children}
      &nbsp;
      { !hideRemove && <X
        className="w-4 h-4 cursor-pointer hover:brightness-150"
        onClick={onRemove}
      />}  
    </span>
  )
}