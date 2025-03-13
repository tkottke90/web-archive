import { Signal, useSignal } from "@preact/signals";
import { motion, Variants } from "framer-motion";
import { Plus, X } from "lucide-preact";
import { createContext, createPortal, JSX, useContext } from "preact/compat";
import { CustomComponent, getPortalContainer } from "../../utilities/component.utils";

const bottomAppBarPortal = getPortalContainer('mobile-drawer')

enum BottomAppBarState {
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  OPEN = 'open'
}

const variants: Variants = {
  hidden: {
    y: '80px'
  },
  closed: {
    y: '-80px'
  },
  open: {
    y: 'calc(-100dvh - 80px)'
  }
}

type AppBarSlots =  'left' | 'right' | 'center'
type SlotChildPositions = JSX.CSSProperties['justifyContent']

const appBarContext = createContext({
  drawerVisible: new Signal(BottomAppBarState.CLOSED)
});

function BottomAppBar({ children }: CustomComponent) {
  const showDrawer = useSignal(BottomAppBarState.CLOSED);

  return (
    <appBarContext.Provider value={{
      drawerVisible: showDrawer
    }}>
      <div className="m-[60px]"></div>
      {createPortal(
        <div id="drawer-container" className="md:hidden">
          <motion.aside
            animate={showDrawer.value}
            variants={variants}
            style={{ position: 'fixed', height: 'fit-content', width: '100dvw', top: '100dvh' }}
            initial={{ y: '-80px' }}
            transition={{ ease: 'easeOut', duration: 0.25 }}
          >
            {children}
          </motion.aside>
        </div>
      , bottomAppBarPortal)}
    </appBarContext.Provider>
  )
}


function AppBarHeader({ children, className }: CustomComponent) {
  return (
    <div id="drawer-header" className={`w-full flex h-[80px] ${className}`}>
      {children}
    </div>
  )
}

/**
 * Basic Slot for Bottom App Bar.  It shows the children inside of the wrapper component.  You select a slot you want
 * want this element to appear in and it is registered to that slot in the app bar.
 */
function AppBarSlot({ alignment, children }: CustomComponent<{ slot?: AppBarSlots, alignment?: SlotChildPositions }>) {
  return (
    <div className={`w-full h-full px-2 bg-burnt-500 text-slate-200 flex justify-${alignment ?? 'start'}`}>
      {children}
    </div>
  );
}

/**
 * Special callout button style.  This element shows a button elevated above the app bar which also curves around the button.
 * Typically used for a call to action button.
 */
function AppBarCalloutBtnSlot({ onClick, icon }: CustomComponent<{ onClick?: () => void, icon?: JSX.Element }>) {
  return (
    <div className="relative">
      <button className="accent icon-button absolute left-1/2 translate-x-[-50%] w-14 h-14" onClick={onClick}>
        { icon ?? <Plus /> }
      </button>
  
      <svg
        width="128"
        height="80"
        viewBox="0 0 128 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
  
      >
        <path d="M0 0C34 0 32 34 64 34C96 34 94.0002 0 128 0V128H0V0Z" className="fill-burnt-500"/>
      </svg>
    </div>
  )
}

/**
 * Creates a Slot with a single button which will open/close the App Bar Menu (slides up from the bottom) 
 */
function AppBarOpenBtnSlot({ children, alignment }: CustomComponent<{ alignment?: SlotChildPositions }>) {
  const AppBarContext = useContext(appBarContext);
  
  return (
    <AppBarSlot alignment={alignment} >
      <button onClick={() => AppBarContext.drawerVisible.value = BottomAppBarState.OPEN}>
        {children}
      </button>
    </AppBarSlot>
  )
}

/**
 * Creates a Slot with a single button which will open/close the App Bar Menu (slides up from the bottom) 
 */
function AppBarBtnSlot({ children }: CustomComponent) {
  
  return (
    <AppBarSlot alignment={'between'}>
      {children}
    </AppBarSlot>
  )
}

function AppBarBody({ children }: CustomComponent) {
  const AppBarContext = useContext(appBarContext);

  return (
    <div id="drawer-body" className="h-[100dvh] relative theme--primary">
      <div className="absolute right-0 top-0 p-4" onClick={() => AppBarContext.drawerVisible.value = BottomAppBarState.CLOSED}>
        <X size="32" />
      </div>
      <br />
      <br />
      { children }
    </div>
  )
}

export default Object.assign(
  BottomAppBar,
  {
    AppBarSlot: AppBarSlot,
    AppBarBtnSlot: AppBarBtnSlot,
    AppBarCalloutBtnSlot: AppBarCalloutBtnSlot,
    AppBarHeader: AppBarHeader,
    AppBarOpenBtnSlot: AppBarOpenBtnSlot,
    AppBarBody: AppBarBody
  }
)