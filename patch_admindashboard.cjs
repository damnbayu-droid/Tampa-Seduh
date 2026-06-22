const fs = require('fs');
const file = './src/components/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add Lucide icons PanelLeftClose, PanelLeftOpen
code = code.replace(
  'import { LogOut, LayoutDashboard, Utensils, MessageSquare, Menu, Settings, Users, Store, Coffee, ChevronRight, X, User, Shield, CreditCard, Clock, CheckCircle, Search, Edit2, Trash2, Plus, Image as ImageIcon, BarChart3, ShoppingBag, PieChart, TrendingUp, DollarSign, Wallet, FileText, Download, CheckCircle2, ArrowLeft, Lock, RefreshCw, Box, AlertCircle, Sun, Moon, Link as LinkIcon, Camera, Copy, Info, Sparkles, Send, Bell, Layers, Bot, BotMessageSquare, Volume2, Database, Key, Server, Mail, Zap, FileClock, History, Terminal, Eye, Receipt } from "lucide-react";',
  'import { LogOut, LayoutDashboard, Utensils, MessageSquare, Menu, Settings, Users, Store, Coffee, ChevronRight, X, User, Shield, CreditCard, Clock, CheckCircle, Search, Edit2, Trash2, Plus, Image as ImageIcon, BarChart3, ShoppingBag, PieChart, TrendingUp, DollarSign, Wallet, FileText, Download, CheckCircle2, ArrowLeft, Lock, RefreshCw, Box, AlertCircle, Sun, Moon, Link as LinkIcon, Camera, Copy, Info, Sparkles, Send, Bell, Layers, Bot, BotMessageSquare, Volume2, Database, Key, Server, Mail, Zap, FileClock, History, Terminal, Eye, Receipt, PanelLeftClose, PanelLeftOpen } from "lucide-react";'
);

// Add isSidebarShrunk state
code = code.replace(
  'const [globalNotif, setGlobalNotif] = useState<{ message: string; type: "success" | "error" | "info" | "loading" } | null>(null);',
  'const [globalNotif, setGlobalNotif] = useState<{ message: string; type: "success" | "error" | "info" | "loading" } | null>(null);\n  const [isSidebarShrunk, setIsSidebarShrunk] = useState(false);\n\n  // Auto-shrink on mobile mount\n  useEffect(() => {\n    if (window.innerWidth < 768) {\n      setIsSidebarShrunk(true);\n    }\n  }, []);'
);

// Modify aside className to be shrinkable
code = code.replace(
  '<aside className="w-full md:w-64 bg-gradient-to-b from-amber-950 via-zinc-900 to-black text-amber-100 md:min-h-screen flex flex-col sticky top-0 z-30">',
  '<aside className={`bg-gradient-to-b from-amber-950 via-zinc-900 to-black text-amber-100 min-h-screen flex flex-col sticky top-0 z-30 transition-all duration-300 flex-shrink-0 ${isSidebarShrunk ? "w-20" : "w-64"}`}>'
);

// Modify sidebar Header (Title + Toggle)
const oldHeader = `<div className="p-6 border-b border-amber-900/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-900 rounded-lg">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg tracking-wide text-amber-50 leading-none">Tampa Seduh</h1>
              <span className="text-[10px] text-amber-400 font-sans tracking-widest uppercase">Admin Terminal</span>
            </div>
          </div>
          <button 
            onClick={handleToggleDark}
            className="p-1.5 hover:bg-white/10 rounded-lg text-amber-200 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>`;

const newHeader = `<div className="p-4 border-b border-amber-900/30 flex flex-col items-center justify-center gap-4">
          <div className={\`flex items-center \${isSidebarShrunk ? "justify-center" : "justify-between"} w-full\`}>
            {!isSidebarShrunk && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-900 rounded-lg shrink-0">
                  <Coffee className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-serif font-bold text-lg tracking-wide text-amber-50 leading-none truncate">Tampa Seduh</h1>
                  <span className="text-[10px] text-amber-400 font-sans tracking-widest uppercase block truncate">Admin Terminal</span>
                </div>
              </div>
            )}
            {isSidebarShrunk && (
              <div className="p-1.5 bg-amber-900 rounded-lg shrink-0 mx-auto">
                <Coffee className="w-6 h-6 text-amber-400" />
              </div>
            )}
          </div>
          
          <div className={\`flex items-center w-full \${isSidebarShrunk ? "justify-center flex-col gap-3" : "justify-between"}\`}>
            <button 
              onClick={() => setIsSidebarShrunk(!isSidebarShrunk)}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-amber-200 transition-all shadow-sm flex items-center justify-center"
              title={isSidebarShrunk ? "Perluas Panel" : "Perkecil Panel"}
            >
              {isSidebarShrunk ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleToggleDark}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-amber-200 transition-all shadow-sm flex items-center justify-center"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>`;
code = code.replace(oldHeader, newHeader);

// Modify Navigation Items
const oldNav = `<button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={\`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer \${
                  isActive
                    ? "bg-amber-900 text-amber-50 shadow"
                    : "text-amber-200/80 hover:text-amber-100 hover:bg-white/5"
                }\`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={\`w-4 h-4 \${isActive ? "text-amber-300" : "text-amber-400 group-hover:text-amber-300"}\`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-red-500 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-amber-950">
                    {item.badge}
                  </span>
                ) : null}
              </button>`;

const newNav = `<button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                title={isSidebarShrunk ? item.label : undefined}
                className={\`w-full flex items-center \${isSidebarShrunk ? "justify-center" : "justify-between"} \${isSidebarShrunk ? "px-2 py-3" : "px-3.5 py-2.5"} rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer \${
                  isActive
                    ? "bg-amber-900 text-amber-50 shadow"
                    : "text-amber-200/80 hover:text-amber-100 hover:bg-white/5"
                }\`}
              >
                <div className={\`flex items-center \${isSidebarShrunk ? "justify-center" : "gap-2.5"}\`}>
                  <div className="relative">
                    <Icon className={\`\${isSidebarShrunk ? "w-6 h-6" : "w-4 h-4"} \${isActive ? "text-amber-300" : "text-amber-400 group-hover:text-amber-300"}\`} />
                    {isSidebarShrunk && item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full ring-2 ring-amber-950" />
                    )}
                  </div>
                  {!isSidebarShrunk && <span className="truncate">{item.label}</span>}
                </div>
                {!isSidebarShrunk && item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-amber-950 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>`;
code = code.replace(oldNav, newNav);

// Modify Bottom buttons
const oldBottom = `<div className="p-4 border-t border-amber-900/30 space-y-2">
          <button
            onClick={onBackToStorefront}
            className="w-full bg-amber-900/30 hover:bg-amber-900/60 text-amber-200 border border-amber-800/40 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali Ke Kedai
          </button>
          
          <button
            onClick={async () => {
              if (confirm("Keluar dari Sesi Admin dari Perangkat ini?")) {
                await supabase.auth.signOut();
                if (onLogoutAdmin) onLogoutAdmin();
              }
            }}
            className="w-full bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/30 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            Keluar (Logout)
          </button>
        </div>`;

const newBottom = `<div className="p-4 border-t border-amber-900/30 space-y-2">
          <button
            onClick={onBackToStorefront}
            title={isSidebarShrunk ? "Kembali Ke Kedai" : undefined}
            className="w-full bg-amber-900/30 hover:bg-amber-900/60 text-amber-200 border border-amber-800/40 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className={isSidebarShrunk ? "w-5 h-5" : "w-3.5 h-3.5 shrink-0"} />
            {!isSidebarShrunk && <span className="truncate">Kembali Ke Kedai</span>}
          </button>
          
          <button
            onClick={async () => {
              if (confirm("Keluar dari Sesi Admin dari Perangkat ini?")) {
                await supabase.auth.signOut();
                if (onLogoutAdmin) onLogoutAdmin();
              }
            }}
            title={isSidebarShrunk ? "Keluar (Logout)" : undefined}
            className="w-full bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/30 py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Lock className={isSidebarShrunk ? "w-5 h-5" : "w-3.5 h-3.5 shrink-0"} />
            {!isSidebarShrunk && <span className="truncate">Keluar</span>}
          </button>
        </div>`;
code = code.replace(oldBottom, newBottom);

// Make the main wrapper horizontally scrollable if needed on mobile
code = code.replace(
  '<div className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row font-sans">',
  '<div className="min-h-screen h-screen overflow-hidden bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-row font-sans w-full max-w-[100vw]">'
);

fs.writeFileSync(file, code);
