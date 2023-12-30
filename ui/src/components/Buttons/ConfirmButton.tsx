import { useSignal } from "@preact/signals";
import { JSX } from "preact/jsx-runtime";

type ConfirmBtnProps = {
  label: string,
  className?: string;
  confirmMessage?: JSX.Element,
  confirmClassName?: string,
  onConfirm?: () => void
};

export function ConfirmButton({ label, className, confirmMessage, confirmClassName, onConfirm }: ConfirmBtnProps) {
  const pendingConfirm = useSignal(false);

  return (
    <button onClick={(e: MouseEvent) => {
      if (pendingConfirm.value) {
        onConfirm && onConfirm();
      } else {
        pendingConfirm.value = true;
        setTimeout(() => {
          pendingConfirm.value = false;
        }, 2500);
      }
    }}
    className={[pendingConfirm.value ? confirmClassName : className, 'transition-all'].join(' ')}
    >
      {pendingConfirm.value 
        ? confirmMessage ?? (<span>confirm</span>)
        : label}
    </button>
  )
}