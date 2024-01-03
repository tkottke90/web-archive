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