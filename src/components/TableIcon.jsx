export default function TableIcon({ capacity = 4 }) {
  const seats = capacity <= 2 ? 2 : capacity <= 4 ? 4 : 8;
  return <svg className="flow-table-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <rect x="24" y="24" width="52" height="52" rx="12" fill="currentColor" opacity=".14" />
    <rect x="24" y="24" width="52" height="52" rx="12" stroke="currentColor" strokeWidth="3" />
    <rect x="39" y="9" width="22" height="9" rx="4" fill="currentColor" />
    <rect x="39" y="82" width="22" height="9" rx="4" fill="currentColor" />
    {seats >= 4 && <><rect x="9" y="39" width="9" height="22" rx="4" fill="currentColor" /><rect x="82" y="39" width="9" height="22" rx="4" fill="currentColor" /></>}
    {seats === 8 && <><rect x="17" y="12" width="15" height="8" rx="3" transform="rotate(-40 24 16)" fill="currentColor" /><rect x="68" y="12" width="15" height="8" rx="3" transform="rotate(40 76 16)" fill="currentColor" /><rect x="17" y="80" width="15" height="8" rx="3" transform="rotate(40 24 84)" fill="currentColor" /><rect x="68" y="80" width="15" height="8" rx="3" transform="rotate(-40 76 84)" fill="currentColor" /></>}
  </svg>;
}
