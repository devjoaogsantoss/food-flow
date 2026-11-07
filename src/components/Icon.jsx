const paths = {
  clock: (
    <>
      <circle
        cx="12"
        cy="12"
        r="8.5"
      />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  book: (
    <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14" />
  ),
  bell: <path d="M4 17h16M6 15a6 6 0 0 1 12 0M12 7V5m-2 0h4M3 20h18" />,
  check: (
    <>
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
      />
      <path d="M4 9h16m-11 5 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2"
      />
      <path d="M8 3v4m8-4v4M4 11h16m-12 4h2m4 0h2" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  lock: (
    <>
      <rect
        x="6"
        y="10"
        width="12"
        height="11"
        rx="2"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
};
export default function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
