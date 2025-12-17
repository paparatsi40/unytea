import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
}

export function Logo({ className = "", iconSize = 40, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon - La taza */}
      <Image 
        src="/branding/logo/unytea-icon.png" 
        alt="Unytea Icon" 
        width={iconSize}
        height={iconSize}
        className="object-contain"
        priority
      />
      
      {/* Text - "Unytea" */}
      {showText && (
        <Image 
          src="/branding/logo/unytea-text.png" 
          alt="Unytea" 
          width={iconSize * 2.5}
          height={iconSize * 0.6}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      )}
    </div>
  );
}

export function LogoWithText({ 
  className = "",
  textClassName = "text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
}: { 
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Solo la taza/icon */}
      <Image 
        src="/branding/logo/unytea-icon.png" 
        alt="Unytea Icon" 
        width={50}
        height={50}
        className="object-contain"
        priority
      />
      {/* Texto "Unytea" */}
      <span className={textClassName}>Unytea</span>
    </div>
  );
}