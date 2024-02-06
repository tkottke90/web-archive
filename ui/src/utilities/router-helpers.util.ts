import { route } from "preact-router";

export function navigateOnClick(url: string) {
  return (e: Event) => {
    e.preventDefault();

    route(url, true);
  }
}
  