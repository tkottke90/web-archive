export function delay(timeout: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, timeout);
  });
}
