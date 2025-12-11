export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`${className} bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center font-bold text-white text-xl`}>
      U
    </div>
  );
}

export function LogoWithText({ 
  className = "",
  textClassName = "text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
}: { 
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Logo className="w-10 h-10" />
      <span className={textClassName}>Unytea</span>
    </div>
  );
}