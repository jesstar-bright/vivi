const CreaLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="crea-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(330, 65%, 52%)" />
        <stop offset="50%" stopColor="hsl(270, 60%, 58%)" />
        <stop offset="100%" stopColor="hsl(220, 65%, 55%)" />
      </linearGradient>
    </defs>
    {/* Outer crescent arc — the strike */}
    <path
      d="M6 24C6 13.5 13.5 6 24 6"
      stroke="url(#crea-grad)"
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
    {/* Inner spark — the creation point */}
    <path
      d="M10 22C10 15.4 15.4 10 22 10"
      stroke="url(#crea-grad)"
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
      opacity={0.5}
    />
    {/* Impact dot */}
    <circle cx="24" cy="6" r="2" fill="url(#crea-grad)" />
  </svg>
);

export default CreaLogo;
