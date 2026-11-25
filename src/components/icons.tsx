// One stroke weight for every icon in the app.
const icon = (path: string) => ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
)

export const CloseIcon = icon('M6 6l12 12M18 6L6 18')
export const HistoryIcon = icon('M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5v4h4')
export const TrashIcon = icon('M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12')
export const UploadIcon = icon('M12 16V5m0 0l-4 4m4-4l4 4M5 19h14')
export const PrevIcon = icon('M15 5l-7 7 7 7')
export const NextIcon = icon('M9 5l7 7-7 7')
export const UserIcon = icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0')
