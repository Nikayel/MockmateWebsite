interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Stylized "S" made of connected nodes - represents skill paths */}
      <path
        d="M22 8C22 8 18 8 16 10C14 12 14 14 16 16C18 18 18 20 16 22C14 24 10 24 10 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Top node */}
      <circle cx="22" cy="8" r="3" fill="currentColor" />
      {/* Middle node */}
      <circle cx="16" cy="16" r="2.5" fill="#00ff88" />
      {/* Bottom node */}
      <circle cx="10" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

export function LogoWithText({ className = '', size = 32 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={size} />
      <span className="text-xl font-heading font-bold text-white">Skillon</span>
    </div>
  );
}

export default Logo;
