import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full glass-panel-heavy border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-7 h-7 rounded-md bg-gradient-accent flex items-center justify-center font-black text-sm text-white shadow-lg shadow-brandPurple/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white group-hover:opacity-90 transition-opacity">
            Pahe<span className="text-gradient font-black">Play</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              pathname === '/'
                ? 'bg-brandPurple/10 text-brandPurple'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </Link>
        </nav>

        {/* Right side */}
        <Link
          to="/admin"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 shrink-0"
        >
          Cookies
        </Link>
      </div>
    </header>
  );
}
