import { ComponentChildren } from "preact";

export function Card({ children }: { children?: ComponentChildren }) {
  return (
    <div className="bg-cloud-100 border rounded border-cloud-400 shadow-md p-4">
      {children}
    </div>
  )
}