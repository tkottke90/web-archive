import { useSignal } from "@preact/signals";
import { JSX } from "preact/jsx-runtime";
import { compoundClass, CustomComponent } from "../../utilities/component.utils";

type ConfirmBtnProps = {
  label: JSX.Element,
  confirm?: JSX.Element,
  confirmClassName?: string,
  onConfirm?: () => void
};

export function ConfirmButton({ label, className, confirm, confirmClassName, onConfirm }: CustomComponent<ConfirmBtnProps>) {
  const pendingConfirm = useSignal(false);

  return (
    <button onClick={() => {
      if (pendingConfirm.value) {
        onConfirm && onConfirm();
      } else {
        pendingConfirm.value = true;
        setTimeout(() => {
          pendingConfirm.value = false;
        }, 2500);
      }
    }}
    className={compoundClass('transition-all', {
      [confirmClassName ?? '_blank-confirm-classname']: pendingConfirm.value,
      [className ?? '_blank-confirm']: !pendingConfirm.value
    })}
    >
      {pendingConfirm.value 
        ? confirm ?? (<span>confirm</span>)
        : label}
    </button>
  )
}