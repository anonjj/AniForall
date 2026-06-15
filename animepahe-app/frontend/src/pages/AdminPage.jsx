import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getCookieStatus, injectCookies, clearCookies } from '../api/client';

export default function AdminPage() {
  const [status, setStatus] = useState(null);
  const [cookieInput, setCookieInput] = useState('');
  const [msg, setMsg] = useState(null);

  async function loadStatus() {
    try {
      const res = await getCookieStatus();
      setStatus(res.data);
    } catch {
      setStatus({ ok: false, message: 'Backend unreachable' });
    }
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleInject(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await injectCookies(cookieInput.trim());
      setMsg({ type: 'ok', text: `Injected ${res.data.injected} cookie(s) successfully.` });
      setCookieInput('');
      loadStatus();
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || err.message });
    }
  }

  async function handleClear() {
    setMsg(null);
    try {
      await clearCookies();
      setMsg({ type: 'ok', text: 'Cookies cleared. Browser bypass will run on next request.' });
      loadStatus();
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    }
  }

  return (
    <div className="min-h-screen bg-[#07080b] text-white pb-16">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 mt-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Cloudflare Cookie Manager</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Use this when the automated browser bypass times out. Paste cookies
            from DevTools and they'll be used for all AnimePahe requests.
          </p>
        </div>

        {/* Status */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Current Status</div>
          {status === null ? (
            <span className="text-zinc-400 text-sm">Loading...</span>
          ) : status.ok ? (
            <>
              <div className="text-green-400 font-semibold text-sm">Cookies on file</div>
              <div className="text-zinc-400 text-xs">{status.cookieCount} cookie(s) · {status.ageDays} day(s) old</div>
              {status.ageDays > 7 && (
                <div className="text-yellow-400 text-xs mt-1">Cookies are getting old — consider refreshing if you get errors.</div>
              )}
            </>
          ) : (
            <div className="text-red-400 font-semibold text-sm">{status.message}</div>
          )}
        </div>

        {/* Inject Form */}
        <form onSubmit={handleInject} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Paste Cookie Header
            </label>
            <textarea
              value={cookieInput}
              onChange={e => setCookieInput(e.target.value)}
              rows={4}
              placeholder="cf_clearance=abc123...; __ddg1_=xyz456..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-brandPurple/50 resize-none font-mono"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Open AnimePahe in Chrome → DevTools → Application → Cookies → copy{' '}
              <code className="text-zinc-400">cf_clearance</code> and any other cookies as a{' '}
              <code className="text-zinc-400">name=value; name2=value2</code> string.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!cookieInput.trim()}
              className="px-5 py-2 bg-brandPurple text-white text-sm font-bold rounded-xl hover:opacity-90 transition disabled:opacity-30 disabled:pointer-events-none"
            >
              Inject Cookies
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2 bg-white/5 border border-white/10 text-zinc-300 text-sm font-semibold rounded-xl hover:bg-white/10 transition"
            >
              Clear & Force Refresh
            </button>
          </div>
        </form>

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-semibold ${msg.type === 'ok' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {msg.text}
          </div>
        )}

        {/* How-to */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.03] space-y-3 text-sm text-zinc-400">
          <div className="font-bold text-white text-xs uppercase tracking-wider">How to get cookies from Chrome</div>
          <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
            <li>Open <strong className="text-zinc-300">animepahe.pw</strong> in Chrome and solve the Cloudflare challenge</li>
            <li>Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F12</kbd> to open DevTools</li>
            <li>Go to <strong className="text-zinc-300">Application → Storage → Cookies → https://animepahe.pw</strong></li>
            <li>Find <code className="text-zinc-300">cf_clearance</code> (and <code className="text-zinc-300">__ddg1_</code> if present)</li>
            <li>Copy the values and paste them above as <code className="text-zinc-300">name=value; name2=value2</code></li>
          </ol>
        </div>
      </main>
    </div>
  );
}
