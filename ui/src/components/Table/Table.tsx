import { Signal } from '@preact/signals';
import { JSX } from 'preact/jsx-runtime';

type TableHeader<T> = { [K in keyof T]: {
  key: K;
  transform?: (value: T[K]) => JSX.Element | JSX.Element[] | string | string [];
  label?: string,
  className?: string,
  columnStyles?: string
}}[keyof T]

interface TableProps<T extends Record<string, any>> {
  headers: Array<TableHeader<T>>,
  entries: Signal<T>[],
  onRowClick?: (rowData: Signal<T>, rowIndex: number) => void
}

export function Table<T extends Record<string, any>>({ headers, entries, onRowClick }: TableProps<T>) {
  return (
    <table class="w-full table-fixed">
      <colgroup>
        {headers.map(cell => (<col className={cell.columnStyles} />))}
      </colgroup>
      <thead>
        <tr class="bg-cloud-300">
          {headers.map(cell => (<th className="text-left">{cell.label ?? cell.key.toString()}</th>))}
        </tr>
      </thead>
      <tbody>
          {entries.map((entry, index) => 
            <tr class="py-4 border-b-2 hover:bg-burnt-100 hover:cursor-pointer" onClick={(e) => {
              e.preventDefault();

              onRowClick && onRowClick(entry, index);
            }} >
              {headers.map(col => {
                const value = col.transform
                  ? col.transform(entry.value[col.key])
                  : entry.value[col.key]
                
                return (<td className={col.className ?? ''}>{value}</td>)
              })}
            </tr>
          )}
      </tbody>
    </table>
  )
}