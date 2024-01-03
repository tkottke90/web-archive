import { ComponentChildren } from "preact";

export function Card({ children, className }: { children?: ComponentChildren, className?: string }) {
  return (
    <div className={`bg-cloud-100 border rounded border-cloud-400 shadow-md p-4 ${className}`}>
      {children}
    </div>
  )
}