import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* CodeSparring Logo: Two brackets facing off with lightning spark */}

      {/* Left bracket < - cyan */}
      <path
        d="M11 8L4 16L11 24"
        stroke="#00d9ff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right bracket > - green */}
      <path
        d="M21 8L28 16L21 24"
        stroke="#00ff88"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lightning spark in center */}
      <path
        d="M17.5 10L15 15.5H17.5L15 22"
        stroke="url(#logo-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <defs>
        <linearGradient
          id="logo-gradient"
          x1="15"
          y1="10"
          x2="17.5"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00d9ff" />
          <stop offset="1" stopColor="#00ff88" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function LogoWithText({ className = "", size = 32 }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={size} />
      <span className="text-xl font-heading font-bold tracking-tight">
        <span className="text-white">Code</span>
        <span className="text-accent">Sparring</span>
      </span>
    </div>
  )
}

export default Logo
