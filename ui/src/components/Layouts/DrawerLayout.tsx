import { Signal } from "@preact/signals";
import { Fragment } from "preact";
import { Link } from "preact-router";
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

function Navigation() {
  return (
    <section>
      <br />
      <br />
      <Link>
        <nav class="w-full p-4 uppercase text-center text-lg">Jobs</nav>
      </Link>
    </section>
  )
}
