import type { SVGProps } from 'react'

// Small inline icon set (stroke-based, 24px grid). Service icons are looked
// up by the `icon` string the API returns; unknown names fall back to "wind".
const paths: Record<string, string> = {
  wind: 'M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 17c1.4 0 2.5-1.1 2.5-2.5 0-1.4-.5-2-1-3-1.1-2.2-.2-4.1 2-5.5.5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.5-2.3 1-3.5',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  sun: 'M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM5 18l.8 2.2L8 21l-2.2.8L5 24l-.8-2.2L2 21l2.2-.8zM19 2l.6 1.6L21 4l-1.4.6L19 6l-.6-1.4L17 4l1.4-.4z',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-2 2-1.7-1.3a4 4 0 0 1-5.6-5.4L3 17l4 4 8.7-8.7z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 17-4.3-4.3',
  building: 'M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16m0-10h3a1 1 0 0 1 1 1v9M9 8h2m-2 4h2m-2 4h2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  check: 'M20 6 9 17l-5-5',
  star: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  pin: 'M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mail: 'M3 6h18v12H3zm0 0 9 7 9-7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  quote: 'M7 7h4v6H7v4H5v-6a4 4 0 0 1 2-4zm10 0h4v6h-4v4h-2v-6a4 4 0 0 1 2-4z',
  leaf: 'M4 20C4 10 10 4 20 4c0 10-6 16-16 16zm0 0c4-6 8-9 12-12',
  chevron: 'm6 9 6 6 6-6',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  chat: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4z',
}

interface Props extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
}

export function Icon({ name, size = 24, className, ...rest }: Props) {
  const d = paths[name] ?? paths.wind
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
