import { ExclamationTriangleIcon, ArrowPathIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function ErrorState({ message, onRetry, directLink }) {
  const isCookieError = message && (
    message.toLowerCase().includes('ddos-guard') ||
    message.toLowerCase().includes('cookie') ||
    message.toLowerCase().includes('clearance') ||
    message.toLowerCase().includes('cloudflare')
  );

  if (isCookieError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 max-w-2xl mx-auto text-left animate-fadeIn bg-white/[0.02] border border-white/5 rounded-2xl p-8">
        <div className="w-16 h-16 rounded-full bg-brandPurple/10 border border-brandPurple/20 flex items-center justify-center mb-6 text-brandPurple">
          <ShieldCheckIcon className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Cloudflare Clearance Required</h3>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          AnimePahe's Cloudflare protection is blocking the automated request. Since headless Playwright was blocked, you must manually solve the challenge in your browser and import cookies.
        </p>

        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-5 mb-8 space-y-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">How to extract and update cookies:</h4>
          <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed">
            <li>
              Open {directLink ? (
                <a href={directLink} target="_blank" rel="noopener noreferrer" className="text-brandPurple hover:underline font-semibold">this direct play link</a>
              ) : (
                <a href="https://animepahe.pw" target="_blank" rel="noopener noreferrer" className="text-brandPurple hover:underline font-semibold">https://animepahe.pw</a>
              )} in your browser and complete the challenge.
            </li>
            <li>
              Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F12</kbd> or <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Cmd + Option + I</kbd> to open Developer Tools.
            </li>
            <li>
              Go to the <strong className="text-white">Network</strong> tab and refresh the page (<kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Cmd + R</kbd>).
            </li>
            <li>
              Click the first request (named <code className="text-brandPurple">animepahe.pw</code> or similar).
            </li>
            <li>
              Under the <strong className="text-white">Headers</strong> tab, scroll down to <strong className="text-white">Request Headers</strong> and find the <code className="text-zinc-200">Cookie:</code> line.
            </li>
            <li>
              Copy the entire cookie string (everything after <code className="text-zinc-400">Cookie: </code>) and paste it into the Cookie Manager, or save it in your project's <code className="text-zinc-400">backend/src/cookies.txt</code>.
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-4 w-full justify-center">
          <Link
            to="/admin"
            className="flex items-center gap-2 px-6 py-3 bg-brandPurple hover:bg-brandPurple/90 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-brandPurple/20 active:scale-95"
          >
            Go to Manage Cookies
          </Link>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 font-semibold text-sm rounded-xl transition-all active:scale-95"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-500">
        <ExclamationTriangleIcon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
      <p className="text-zinc-400 text-sm max-w-md mb-6">
        {message || 'An unexpected error occurred while loading content.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-brandPurple hover:bg-brandPurple/90 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-brandPurple/20 active:scale-95"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
