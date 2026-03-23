const RANGE_BYTES_HEADER_VALUE = 'bytes=';

function parseBytesHeader(bytesHeader: string) {
  const parts = bytesHeader.split('-');
  const start = Number(parts[0]);
  const end = parts[1] === '' || parts[1] === undefined ? -1 : Number(parts[1]);
  return { start, end };
}

export function parseRangeHeader(rangeHeader: string) {
  const start = 0;
  const end = -1;

  if (rangeHeader.startsWith(RANGE_BYTES_HEADER_VALUE)) {
    const bytesHeader = rangeHeader.substring(RANGE_BYTES_HEADER_VALUE.length);
    return parseBytesHeader(bytesHeader);
  }

  return { start, end };
}
