import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brandPurple/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:opacity-90 transition-opacity">
            Pahe<span className="text-gradient font-black">Play</span>
          </span>
        </Link>
      </div>

      <nav className="flex items-center gap-6">
        <Link 
          to="/" 
          className="text-zinc-400 hover:text-white font-medium text-sm transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-brandPurple hover:after:w-full after:transition-all"
        >
          Discover
        </Link>
        <Link 
          to="/admin" 
          className="text-zinc-400 hover:text-white font-medium text-sm transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-brandPurple hover:after:w-full after:transition-all"
        >
          Manage Cookies
        </Link>
      </nav>
    </header>
  );
}
