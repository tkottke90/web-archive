import { Signal } from "@preact/signals";
import { Fragment } from "preact";
import { Link } from "preact-router/match";
import { compoundClass, CustomComponent } from "../../utilities/component.utils";

type DrawerProps = {
  openDrawer?: Signal<boolean>
}

export function DrawerLayout(props: CustomComponent<DrawerProps>) {
  return (
    <Fragment>
      <main class="h-full w-full grid md:grid-cols-[250px_1fr] grid-cols-[1fr]">
        <aside class={
          compoundClass(
            "bg-burnt-500 text-cloud-200 h-full flex flex-col gap-1 shadow-sm absolute translate-x-[-100%] top-0 bottom-0 md:relative md:translate-x-[0] md:top-[unset] md:bottom-[unset]",
            { 'translate-x-0': props?.openDrawer?.value ?? false }
          )
        }>
          <h2 class="text-4xl text-center my-2">Web Archive</h2>
          <section class="min-h-1 grow">
            <Navigation />
          </section>
          
        </aside>
        <section className={['h-full p-4', props.className ].join(' ')}>
          {props.children}
        </section>
      </main>
    </Fragment>
  )
}

// NavLink wraps preact-router/match Link with href prop.
// The `as any` cast is needed because Link's TypeScript types don't include
// href despite it being required for navigation (passed through to <a>).
function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link activeClassName="active-link" class="px-4 py-2 hover:bg-burnt-400" path={href} {...{ href } as any}>
      {children}
    </Link>
  );
}

export function Navigation() {
  return (
    <nav class="flex flex-col">
      <NavLink href="/">Posts</NavLink>
      <NavLink href="/tags">Tags</NavLink>
      <NavLink href="/jobs">Jobs</NavLink>
    </nav>
  )
}
