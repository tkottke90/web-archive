import { ComponentChildren, ComponentProps } from "preact"
import { Link } from "preact-router"

type DrawerProps = {
  className?: string;
  children?: ComponentChildren;
}

export function DrawerLayout(props: DrawerProps) {


  return (
    <main class="h-full w-full grid grid-cols-[250px_1fr]">
      <aside class="bg-burnt-500 text-cloud-200 h-full flex flex-col gap-1">
        <h2 class="text-4xl text-center my-2">Web Archive</h2>
        <section class="min-h-1 grow">

        </section>
        <section>
          <Link>
            <nav class="w-full p-4 uppercase text-center text-lg">Settings</nav>
          </Link>
        </section>
      </aside>
      <section className={['h-full p-4', props.children ].join(' ')}>
        {props.children}
      </section>
    </main>
  )
}