import { ComponentChildren } from "preact";

export interface DefaultProps  {
  key?: string;
  children?: ComponentChildren,
  className?: string
}

export type CustomComponent<T = {}> = Partial<DefaultProps> & T

export interface RouteProps extends Partial<DefaultProps> {
  path: string;
}

export function compoundClass(baseStyles: string, conditionalStyles: Record<string, boolean>) {
  return Object.entries(conditionalStyles).reduce((acc, [key, value]) => {
    if (value) {
      return `${acc} ${key}`;
    }

    return acc;
  }, baseStyles);
}

export function getPortalContainer(containerId: string) {
  let portal = document.getElementById(containerId) as HTMLDivElement;
  if (!portal) {
    portal = document.createElement('div');
    portal.id = containerId;
    portal.classList.add('portals');
    document.body.appendChild(portal);
  }

  return portal;
}