export function returnFileSize(input: number) {
  if (input < 1024) {
    return `${input} bytes`;
  } else if (input >= 1024 && input < 1048576) {
    return `${(input / 1024).toFixed(1)} KB`;
  } else if (input >= 1048576) {
    return `${(input / 1048576).toFixed(1)} MB`;
  }
}
