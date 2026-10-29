import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, RefreshCw, Settings, MessageCircle, ExternalLink, Copy, Check,
  Ban, Trash2, Heart, Sparkles, SlidersHorizontal, LayoutDashboard, Tags,
  MessageSquareText, CircleHelp, Clock3, AlertCircle, Plus, X, ChevronDown,
  Zap, ShieldCheck, Menu, Filter, Database, KeyRound
} from "lucide-react";
import "./styles.css";

const STORE_KEY = "purple-buyer-finder-v1";
const DEFAULTS = {
  hashtags: ["#zonauang", "#zonajajan", "#bealanja", "#zonapromosi"],
  keywords: ["WTB", "need", "butuh", "mau beli", "lagi nyari", "cari", "ada yang jual"],
  apps: ["Netflix", "Spotify", "YouTube Premium", "CapCut", "Canva", "Vidio", "WeTV", "Disney+", "ChatGPT", "Claude AI"],
  templates: [
    "Haii kak, kalau masih nyari boleh mampir ke Purple Store yaa ♡",
    "Masih need kak? Boleh cek Purple Store, siapa tahu ada yang cocok 𐙚",
    "Kalau masih cari, boleh banget mampir ke Purple Store yaa! Makasih ♡"
  ],
  statuses: {},
  savedTweets: [],
  lastUpdated: null,
  autoRefresh: false,
  refreshMinutes: 30
};

function readStore() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch { return { ...DEFAULTS }; }
}
function saveStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
}
function matchesApp(tweet, apps) {
  const lower = tweet.text.toLowerCase();
  return apps.find(app => lower.includes(app.toLowerCase())) || "Lainnya";
}
function matchesKeyword(tweet, keywords) {
  const lower = tweet.text.toLowerCase();
  return keywords.find(k => lower.includes(k.toLowerCase())) || "—";
}
function intent(tweet, keywords, apps) {
  const text = tweet.text.toLowerCase();
  const key = matchesKeyword(tweet, keywords) !== "—";
  const app = matchesApp(tweet, apps) !== "Lainnya";
  const sellerWords = ["open", "ready stock", "ready ya", "jual", "pricelist", "open order"];
  const seller = sellerWords.some(w => text.includes(w));
  if (key && app && !seller) return { label: "Potensi pembeli", kind: "good", reason: "Ada keyword pencarian dan nama aplikasi." };
  if (seller) return { label: "Perlu diperiksa", kind: "warn", reason: "Ada kata yang bisa menandakan promosi seller." };
  return { label: "Perlu diperiksa", kind: "neutral", reason: key ? "Ada keyword pencarian, periksa konteksnya." : "Konteks belum cukup kuat." };
}
function timeAgo(value) {
  if (!value) return "Waktu tidak tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  if (mins < 1440) return `${Math.floor(mins / 60)} jam lalu`;
  return `${Math.floor(mins / 1440)} hari lalu`;
}
function demoTweets() {
  return [
    { id: "demo-1", username: "contohcustomer", name: "Contoh Customer", text: "WTB Netflix 1 bulan, ada yang ready? #zonajajan", createdAt: new Date(Date.now()-4*60000).toISOString(), url: "https://x.com/search?q=WTB%20Netflix", demo: true },
    { id: "demo-2", username: "contohbuyer", name: "Contoh Buyer", text: "Need CapCut Pro dong, ada yang jual?", createdAt: new Date(Date.now()-25*60000).toISOString(), url: "https://x.com/search?q=need%20CapCut", demo: true },
    { id: "demo-3", username: "contohseller", name: "Contoh Seller", text: "OPEN Spotify premium ready stock, cek pricelist yaa", createdAt: new Date(Date.now()-50*60000).toISOString(), url: "https://x.com/search?q=Spotify%20premium", demo: true }
  ];
}

function App() {
  const [store, setStore] = useState(readStore);
  const [tweets, setTweets] = useState(store.savedTweets || []);
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState("Semua aplikasi");
  const [statusFilter, setStatusFilter] = useState("Semua status");
  const [keywordFilter, setKeywordFilter] = useState("Semua keyword");
  const [dateFilter, setDateFilter] = useState("all");
  const [activePage, setActivePage] = useState("Dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiState, setApiState] = useState("unknown");
  const [searchQuery, setSearchQuery] = useState('("WTB" OR "need" OR "butuh" OR "mau beli" OR "cari") (#zonauang OR #zonajajan OR #bealanja OR #zonapromosi)');
  const [showSearchEditor, setShowSearchEditor] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(-1);

  useEffect(() => { saveStore({ ...store, savedTweets: tweets }); }, [store, tweets]);
  useEffect(() => {
    if (!store.autoRefresh || activePage !== "Dashboard") return;
    const id = setInterval(() => fetchTweets(false), Math.max(5, Number(store.refreshMinutes) || 30) * 60000);
    return () => clearInterval(id);
  }, [store.autoRefresh, store.refreshMinutes, activePage, searchQuery]);

  const enriched = useMemo(() => tweets.map(t => ({
    ...t,
    detectedApp: t.detectedApp || matchesApp(t, store.apps),
    matchedKeyword: t.matchedKeyword || matchesKeyword(t, store.keywords),
    intent: intent(t, store.keywords, store.apps)
  })), [tweets, store.apps, store.keywords]);

  const visibleTweets = useMemo(() => enriched.filter(t => {
    const text = `${t.text} ${t.username} ${t.name} ${t.detectedApp}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (appFilter !== "Semua aplikasi" && t.detectedApp !== appFilter) return false;
    if (statusFilter !== "Semua status" && (store.statuses[t.id] || "Baru") !== statusFilter) return false;
    if (keywordFilter !== "Semua keyword" && t.matchedKeyword !== keywordFilter) return false;
    if (dateFilter === "today" && t.createdAt && new Date(t.createdAt).toDateString() !== new Date().toDateString()) return false;
    return true;
  }).sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [enriched, query, appFilter, statusFilter, keywordFilter, dateFilter, store.statuses]);

  const updateStore = (patch) => setStore(prev => ({ ...prev, ...patch }));
  const updateList = (key, value) => updateStore({ [key]: value });

  async function fetchTweets(testOnly = false) {
    setLoading(true); setError(""); setNotice("");
    try {
      const url = `/api/search-tweets?query=${encodeURIComponent(searchQuery)}&queryType=Latest&count=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `Request gagal (${res.status})`);
      setApiState("connected");
      updateStore({ lastUpdated: data.searchedAt || new Date().toISOString() });
      if (testOnly) {
        setNotice(`Koneksi berhasil! ${data.returned ?? data.tweets?.length ?? 0} tweet diterima.`);
      } else {
        const incoming = (data.tweets || []).map(t => ({ ...t, demo: false }));
        setTweets(prev => {
          const map = new Map();
          [...incoming, ...prev.filter(t => !t.demo)].forEach(t => { if (!map.has(t.id)) map.set(t.id, t); });
          return [...map.values()].slice(0, 300);
        });
        setNotice(`${incoming.length} tweet diterima dari API.`);
      }
    } catch (e) {
      setApiState("error");
      setError(e.message || "Gagal mengambil tweet.");
    } finally { setLoading(false); }
  }

  function loadDemo() {
    setTweets(prev => {
      const existing = new Set(prev.map(t => t.id));
      return [...prev, ...demoTweets().filter(t => !existing.has(t.id))];
    });
    setNotice("Data demo ditambahkan. Tweet contoh bukan data asli X.");
    setError("");
  }
  function changeStatus(id, status) {
    updateStore({ statuses: { ...store.statuses, [id]: status } });
  }
  function removeTweet(id) {
    setTweets(prev => prev.filter(t => t.id !== id));
    setNotice("Tweet dihapus dari dashboard lokal.");
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Balasan berhasil disalin ♡");
    } catch { setNotice("Clipboard tidak tersedia. Silakan salin teks secara manual."); }
  }
  function replyText(tweet) {
    const tpl = store.templates[0] || "Haii kak, boleh mampir ke Purple Store yaa ♡";
    return tpl.replaceAll("{username}", tweet.username ? `@${tweet.username}` : "").replaceAll("{app}", tweet.detectedApp || "");
  }
  const counts = {
    total: tweets.filter(t => !t.demo).length,
    new: tweets.filter(t => !t.demo && (store.statuses[t.id] || "Baru") === "Baru").length,
    done: tweets.filter(t => (store.statuses[t.id] || "Baru") === "Selesai").length,
    ignored: tweets.filter(t => (store.statuses[t.id] || "Baru") === "Diabaikan").length
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Templates", icon: MessageSquareText },
    { name: "Filters", icon: Tags },
    { name: "Settings", icon: Settings }
  ];

  function addToList(key) {
    const value = newItem.trim();
    if (!value) return;
    const list = store[key] || [];
    if (!list.some(x => x.toLowerCase() === value.toLowerCase())) updateList(key, [...list, value]);
    setNewItem("");
  }
  function removeFromList(key, item) { updateList(key, (store[key] || []).filter(x => x !== item)); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Heart size={23} fill="currentColor" /></div>
        <div><div className="brand-title">purple store</div><div className="brand-subtitle">buyer finder ♡</div></div>
        <button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)} aria-label="Tutup menu"><X size={18}/></button>
      </div>
      <div className="side-label">MENU UTAMA</div>
      <nav>{navItems.map(item => <button key={item.name} className={`nav-item ${activePage===item.name?"active":""}`} onClick={() => {setActivePage(item.name);setMobileMenu(false);}}><item.icon size={18}/><span>{item.name}</span>{item.name==="Dashboard" && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="mini-card"><Sparkles size={18}/><strong>little reminder</strong><p>Be kind, be cute, and find your customers ♡</p></div>
        <div className="side-footer"><span className={`status-dot ${apiState==="connected"?"online":""}`}/>{apiState==="connected"?"API terhubung":apiState==="error"?"API bermasalah":"API belum dites"}</div>
      </div>
    </aside>
    {mobileMenu && <div className="scrim" onClick={() => setMobileMenu(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(true)} aria-label="Buka menu"><Menu size={21}/></button>
        <div><div className="eyebrow">YOUR LITTLE CUSTOMER CORNER</div><h1>{activePage === "Dashboard" ? "Buyer dashboard" : activePage}</h1></div>
        <div className="top-actions"><span className="today-pill"><Clock3 size={14}/>{new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span><div className="avatar">♡</div></div>
      </header>

      {notice && <div className="notice"><Check size={16}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
      {error && <div className="error-banner"><AlertCircle size={17}/><span>{error}</span><button onClick={()=>setError("")}><X size={15}/></button></div>}

      {activePage==="Dashboard" && <>
        <section className="welcome-card">
          <div className="welcome-content"><div className="welcome-kicker"><Sparkles size={14}/> LET'S FIND YOUR NEXT CUSTOMER</div><h2>Find your people,<br/><span>one tweet at a time.</span></h2><p>Pantau tweet yang lagi mencari produk, lalu sapa mereka dengan cara yang manis ♡</p><div className="welcome-actions"><button className="btn-primary" onClick={()=>fetchTweets(false)} disabled={loading}><RefreshCw size={16} className={loading?"spin":""}/>{loading?"Mencari tweet...":"Refresh tweet"}</button><button className="btn-light" onClick={()=>setShowSearchEditor(v=>!v)}><SlidersHorizontal size={16}/>Atur pencarian</button></div></div>
          <div className="welcome-art"><div className="art-sparkle s1">✦</div><div className="art-sparkle s2">♡</div><div className="art-blob"><Search size={53}/></div><div className="art-note">find a little<br/>magic ✧</div></div>
        </section>
        {showSearchEditor && <section className="panel query-panel"><label>Query pencarian API</label><textarea value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} rows={3}/><small>Gunakan sintaks pencarian yang didukung TwitterAPI.io. Query default adalah contoh awal dan bisa kamu edit.</small><button className="btn-primary" onClick={()=>fetchTweets(false)} disabled={loading}>Cari dengan query ini</button></section>}
        <section className="stats-grid">
          <Stat icon={Search} label="Tweet tersimpan" value={counts.total} tint="lilac"/>
          <Stat icon={Sparkles} label="Belum ditindaklanjuti" value={counts.new} tint="pink"/>
          <Stat icon={Check} label="Selesai" value={counts.done} tint="mint"/>
          <Stat icon={Ban} label="Diabaikan" value={counts.ignored} tint="peach"/>
        </section>
        <section className="panel filters-panel">
          <div className="section-heading"><div><div className="eyebrow">MONITORING FEED</div><h3>Tweet yang ditemukan <span className="count-pill">{visibleTweets.length}</span></h3></div><button className="btn-outline" onClick={loadDemo}><Sparkles size={15}/>Contoh data</button></div>
          <div className="filter-row">
            <div className="search-box"><Search size={17}/><input placeholder="Cari username, tweet, aplikasi..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery("")}><X size={14}/></button>}</div>
            <select value={appFilter} onChange={e=>setAppFilter(e.target.value)}><option>Semua aplikasi</option>{store.apps.map(a=><option key={a}>{a}</option>)}<option>Lainnya</option></select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Semua status</option><option>Baru</option><option>Selesai</option><option>Diabaikan</option></select>
            <select value={keywordFilter} onChange={e=>setKeywordFilter(e.target.value)}><option>Semua keyword</option>{store.keywords.map(k=><option key={k}>{k}</option>)}</select>
            <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)}><option value="all">Semua tanggal</option><option value="today">Hari ini</option></select>
          </div>
          <div className="feed-list">
            {visibleTweets.length===0 ? <div className="empty-state"><div className="empty-icon"><Search size={26}/></div><h3>Belum ada tweet di sini ♡</h3><p>Hubungkan API di Settings, lalu klik Refresh tweet. Kamu juga bisa mencoba data demo.</p><button className="btn-primary" onClick={()=>setActivePage("Settings")}>Buka pengaturan API</button></div> : visibleTweets.map(tweet => {
              const state = store.statuses[tweet.id] || "Baru";
              const tag = intent(tweet,store.keywords,store.apps);
              return <article className="tweet-card" key={tweet.id}>
                <div className="tweet-avatar">{tweet.profileImage ? <img src={tweet.profileImage} alt="" /> : <span>{(tweet.name||tweet.username||"♡").slice(0,1).toUpperCase()}</span>}</div>
                <div className="tweet-body">
                  <div className="tweet-head"><div className="user-line"><strong>{tweet.name || tweet.username || "Pengguna X"}</strong><span>@{tweet.username || "username"}</span><span className="time"><Clock3 size={12}/>{timeAgo(tweet.createdAt)}</span></div><span className={`status-pill ${state.toLowerCase()}`}>{state}</span></div>
                  {tweet.demo && <div className="demo-ribbon">DATA DEMO — BUKAN TWEET ASLI</div>}
                  <p className="tweet-text">{tweet.text}</p>
                  <div className="tweet-tags"><span className="app-tag">{tweet.detectedApp || matchesApp(tweet,store.apps)}</span><span className="keyword-tag">{matchesKeyword(tweet,store.keywords)}</span><span className={`intent-tag ${tag.kind}`} title={tag.reason}>{tag.label}</span></div>
                  <div className="tweet-actions">
                    <a className="btn-outline small" href={tweet.url || `https://x.com/i/web/status/${tweet.id}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Buka tweet</a>
                    <button className="btn-outline small" onClick={()=>copyText(replyText(tweet))}><Copy size={14}/>Salin balasan</button>
                    <button className="btn-outline small" onClick={()=>copyText(replyText(tweet))}><MessageCircle size={14}/>Pakai template</button>
                    <div className="action-spacer"/>
                    <button className="icon-btn success-icon" title="Tandai selesai" onClick={()=>changeStatus(tweet.id,"Selesai")}><Check size={16}/></button>
                    <button className="icon-btn muted-icon" title="Abaikan" onClick={()=>changeStatus(tweet.id,"Diabaikan")}><Ban size={16}/></button>
                    <button className="icon-btn danger-icon" title="Hapus dari dashboard" onClick={()=>removeTweet(tweet.id)}><Trash2 size={16}/></button>
                  </div>
                </div>
              </article>;
            })}
          </div>
        </section>
      </>}

      {activePage==="Templates" && <section className="panel page-panel"><PageHeading icon={MessageSquareText} title="Reply templates" subtitle="Balasan manis yang bisa kamu salin untuk calon customer."/><div className="template-create"><textarea rows={3} placeholder="Tulis template balasan baru..." value={newTemplate} onChange={e=>setNewTemplate(e.target.value)}/><button className="btn-primary" onClick={()=>{if(newTemplate.trim()){updateList("templates",[...store.templates,newTemplate.trim()]);setNewTemplate("");setNotice("Template ditambahkan ♡");}}}><Plus size={16}/>Tambah template</button></div><div className="template-list">{store.templates.map((t,i)=><div className="template-card" key={`${i}-${t}`}><div className="template-number">0{i+1}</div><div className="template-content">{editingTemplate===i?<textarea value={newTemplate} onChange={e=>setNewTemplate(e.target.value)} rows={3}/>:<p>{t}</p>}<div className="template-actions">{editingTemplate===i?<button className="btn-primary small" onClick={()=>{updateList("templates",store.templates.map((x,j)=>j===i?newTemplate:x));setEditingTemplate(-1);setNewTemplate("");}}>Simpan</button>:<button className="btn-outline small" onClick={()=>{setEditingTemplate(i);setNewTemplate(t);}}>Edit</button>}<button className="btn-outline small" onClick={()=>copyText(t)}><Copy size={14}/>Salin</button><button className="btn-outline small danger-text" onClick={()=>updateList("templates",store.templates.filter((_,j)=>j!==i))}><Trash2 size={14}/>Hapus</button></div></div></div>)}</div></section>}

      {activePage==="Filters" && <section className="panel page-panel"><PageHeading icon={Tags} title="Keyword & filters" subtitle="Atur kata dan hashtag yang ingin dipantau."/><ListEditor title="Hashtag monitoring" description="Contoh: #zonajajan" items={store.hashtags} value={newItem} setValue={setNewItem} onAdd={()=>addToList("hashtags")} onRemove={x=>removeFromList("hashtags",x)}/><ListEditor title="Keyword pencarian" description="Contoh: WTB, need, butuh, mau beli" items={store.keywords} value={newItem} setValue={setNewItem} onAdd={()=>addToList("keywords")} onRemove={x=>removeFromList("keywords",x)}/><ListEditor title="Nama aplikasi" description="Nama aplikasi yang dideteksi pada tweet" items={store.apps} value={newItem} setValue={setNewItem} onAdd={()=>addToList("apps")} onRemove={x=>removeFromList("apps",x)}/><div className="helper-box"><CircleHelp size={18}/><p>Perubahan filter memperbarui cara tweet yang tersimpan dikategorikan. Untuk mengubah pencarian API, gunakan <strong>Atur pencarian</strong> di Dashboard dan tulis query sesuai sintaks provider.</p></div></section>}

      {activePage==="Settings" && <section className="panel page-panel"><PageHeading icon={Settings} title="Settings" subtitle="Koneksi API dan preferensi pembaruan."/>
        <div className="settings-card"><div className="settings-icon"><KeyRound size={20}/></div><div className="settings-main"><h3>TwitterAPI.io</h3><p>API key disimpan di environment variable backend Netlify.</p><div className="connection-line"><span className={`status-dot ${apiState==="connected"?"online":apiState==="error"?"offline":""}`}/>{apiState==="connected"?"Koneksi berhasil":apiState==="error"?"Koneksi gagal":"Belum dites"}</div><button className="btn-primary" onClick={()=>fetchTweets(true)} disabled={loading}><ShieldCheck size={16}/>{loading?"Menguji...":"Test koneksi & pencarian"}</button></div></div>
        <div className="settings-card"><div className="settings-icon"><RefreshCw size={20}/></div><div className="settings-main"><h3>Pembaruan otomatis</h3><p>Default mati agar kredit API tidak terpakai tanpa sadar.</p><label className="toggle-row"><span>Aktifkan refresh otomatis</span><input type="checkbox" checked={store.autoRefresh} onChange={e=>updateStore({autoRefresh:e.target.checked})}/></label><label className="field-label">Interval (menit)</label><select value={store.refreshMinutes} onChange={e=>updateStore({refreshMinutes:Number(e.target.value)})}><option value={5}>5 menit</option><option value={15}>15 menit</option><option value={30}>30 menit</option><option value={60}>60 menit</option></select></div></div>
        <div className="settings-card"><div className="settings-icon"><Database size={20}/></div><div className="settings-main"><h3>Penyimpanan lokal</h3><p>Tweet dan pengaturan tersimpan di browser ini. Tidak tersinkronisasi antarperangkat.</p><button className="btn-outline" onClick={()=>{if(confirm("Hapus seluruh pengaturan, tweet, dan status lokal? Tindakan ini tidak bisa dibatalkan.")){localStorage.removeItem(STORE_KEY);window.location.reload();}}}><Trash2 size={15}/>Reset semua data lokal</button></div></div>
        <div className="helper-box"><ShieldCheck size={18}/><p><strong>Cara memasang API key:</strong> di Netlify, buka Site configuration → Environment variables, lalu tambahkan <code>TWITTERAPI_KEY</code> dengan nilai API key-mu. Deploy ulang setelah menambahkan variabel. Jangan tempel key ke frontend atau chat.</p></div>
        {store.lastUpdated && <p className="last-updated">Terakhir berhasil diperbarui: {new Date(store.lastUpdated).toLocaleString("id-ID")}</p>}
      </section>}

      <footer className="footer"><span>made with <Heart size={12} fill="currentColor"/> for Purple Store</span><span>buyer finder · v1.0</span></footer>
    </main>
  </div>;
}

function Stat({icon:Icon,label,value,tint}) { return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={19}/></div><div><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div><span className="stat-sparkle">✧</span></div>; }
function PageHeading({icon:Icon,title,subtitle}) { return <div className="page-heading"><div className="page-heading-icon"><Icon size={21}/></div><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function ListEditor({title,description,items,value,setValue,onAdd,onRemove}) { return <div className="list-editor"><div><h3>{title}</h3><p>{description}</p></div><div className="add-row"><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Tambah item..." onKeyDown={e=>e.key==="Enter"&&onAdd()}/><button className="btn-primary" onClick={onAdd}><Plus size={15}/>Tambah</button></div><div className="chip-list">{items.map(item=><span className="editable-chip" key={item}>{item}<button onClick={()=>onRemove(item)} aria-label={`Hapus ${item}`}><X size={13}/></button></span>)}</div></div>; }

createRoot(document.getElementById("root")).render(<App />);