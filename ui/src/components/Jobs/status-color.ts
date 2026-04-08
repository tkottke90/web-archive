export function statusColor(status: string): string {
  switch (status) {
    case 'ERROR':
      return 'text-red-600 font-bold';
    case 'IN_PROGRESS':
      return 'text-blue-600 font-bold';
    default:
      return '';
  }
}
