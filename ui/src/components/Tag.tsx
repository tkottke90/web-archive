import { ComponentChildren } from "preact";

export function Tag({children, hideRemove, onRemove }: { children: ComponentChildren, hideRemove?: boolean, onRemove?: () => void }) {
  return (
    <span className="rounded-full bg-crown-300 px-2 py-1 whitespace-nowrap font-bold text-sm flex gap-px items-center">
      {children}
      &nbsp;
      { !hideRemove && <svg
        className="w-4 h-4 cursor-pointer hover:brightness-150"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        onClick={onRemove}
      >
        <title>remove</title>
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
      </svg>}  
    </span>
  )
}