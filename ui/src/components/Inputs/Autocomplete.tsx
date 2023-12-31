import { AnimatePresence, motion, Variants } from "framer-motion";
import { ComponentChildren } from "preact";
import { createPortal, useCallback, useState } from "preact/compat";
import { debounceTime, fromEvent, map } from "rxjs";
import { getPortalContainer } from "../../utilities/dom.utils";
import { createPopper } from "@popperjs/core";
import { Signal, useSignal, useSignalEffect } from "@preact/signals";

let autoCompletePortal = getPortalContainer("auto-completes");

const variants: Variants = {
  initial: {
    opacity: [0, 0.9, 1],
    pointerEvents: "none",
    width: "100%",
    position: "absolute",
  },
  in: {
    opacity: 1,
    pointerEvents: "all",
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
      duration: 0.3,
      type: "spring",
      mass: 0.01,
      velocity: 18,
    },
  },
  out: {
    opacity: [1, 0.9, 0],
    pointerEvents: "none",
    transition: {
      type: "spring",
      staggerChildren: 0.02,
      staggerDirection: -1,
      duration: 0.15,
      mass: 0.05,
      velocity: 18,
    },
  },
};

interface DataItem extends Record<string, any> {
  id: number;
}

interface AutoCompleteProps<T extends DataItem> {
  id?: string;
  name: string;
  label: string;
  filter?: string;
  children?:  ComponentChildren;
  onFilterChange?: (value: string) => void;
}

export function AutoComplete<T extends DataItem>({
  id,
  name,
  filter: display,
  children,
  onFilterChange = (value) => {}
}: AutoCompleteProps<T>) {
  const show = useSignal(false);
  const [triggerElem, setTriggerElem] = useState<HTMLInputElement | null>(null);

  // Setup the trigger input element to pen the autocomplete
  const triggerRef = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;

    // Setup open function
    const openMenu = () => {
      node.select();
      show.value = true;
    };

    // On input, update the value of the field after a 500ms 
    // debounce
    const changeEvent = fromEvent<KeyboardEvent>(node, "input")
      .pipe(
        debounceTime(500),
        map((event: KeyboardEvent) => {
          return [(event.target as HTMLInputElement).value, event.key];
        })
      )
      .subscribe(([value]) => onFilterChange(value));

    // Navigation listener
    const arrowEvent = fromEvent<KeyboardEvent>(node, 'keyup')
        .subscribe(e => {
          if (e.key.includes('Arrow')) {
            console.log(e.key)
          }
        })
        
    // Setup menu closing action
    const leaveEvent = fromEvent<Event>(node, 'focusout')
        .subscribe(() => {
          // show.value = false;
        });

    node.addEventListener("click", openMenu);

    setTriggerElem(node);

    return () => {
      node.removeEventListener("click", openMenu);
      leaveEvent.unsubscribe();
      changeEvent.unsubscribe();
      arrowEvent.unsubscribe();
    };
  }, []);

  return (
    <div>
      <input
        autoComplete="custom-autocomplete"
        ref={triggerRef}
        id={id}
        value={display}
        onClick={(event: MouseEvent) => event.preventDefault()}
        onFocus={() => show.value = true}
      />

      {createPortal(
        <AutoCompleteMenu
          triggerElem={triggerElem}
          id={`autocomplete-${id ?? name}`}
          show={show}
          onClose={() => show.value = false}
        >
          {children}
        </AutoCompleteMenu>,
        autoCompletePortal
      )}
    </div>
  );
}

interface AutoCompleteMenuProps {
  id: string;
  show: Signal<boolean>;
  triggerElem: HTMLInputElement | null;
  onClose: () => void;
  children?: ComponentChildren;
}

function AutoCompleteMenu({children, id, onClose, show, triggerElem }: AutoCompleteMenuProps) {
  // Open controls visibility and animation
  const open = useSignal(false);

  // when show is set to true, we want open to follow
  useSignalEffect(() => {
    if (show) {
      open.value = true;
    }
  });

  // Execute a function outside of the render loop and
  // save the result which calculates WHERE the target
  // element is located
  const menuRef = useCallback((node: HTMLElement | null) => {
    // Do nothing if no trigger element provider OR
    // a node is not associated with the ref
    if (!node || !triggerElem) return;

    // Setup closing fn
    const closeMenu = (e: MouseEvent) => { onClose() }

    // Calculate trigger position
    const triggerDim = triggerElem.getBoundingClientRect();

    // Match the width of the menu to that of the trigger
    node.style.width = `${triggerDim.width}px`;

    // Register close menu fn
    node.addEventListener("click", closeMenu);

    // Setup menu position using PopperJs
    createPopper(triggerElem, node);
    
    // On unmounting, umount the event listener
    return () => {
      node.removeEventListener("click", closeMenu);
    };
  }, [triggerElem]);

  // Return nothing when show is not visible
  // This will remove the menu from the DOM
  if (!show.value) {
    return null;
  }

  return (
    <div>
      {open && <div className="overlay" /*onClick={() => open.value = false}*/></div>}
       <AnimatePresence>
         {open && (
          <motion.div
            key={id}
            initial="initial"
            animate="in"
            exit="out"
            variants={variants}
            style={{
              transformOrigin: "top left",
            }}
            onAnimationComplete={(d: string) => d === "out" && onClose()}
          >
            <div className="bg-neutral-50 shadow-md" ref={menuRef}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AutocompleteItemProps {
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export function AutocompleteItem({
  children,
  className = "",
  disabled = false,
  onSelect = () => {},
}: AutocompleteItemProps) {
  const attr: Record<string, any> = {};

  if (disabled) {
    attr.disabled = "";
  }

  return (
    <div
      onClick={() => onSelect()}
      {...attr}
      className={`py-2 px-4 cursor-pointer hover:bg-burnt-500 hover:text-slate-200 ${className}`}
    >
      {children}
    </div>
  );
}
