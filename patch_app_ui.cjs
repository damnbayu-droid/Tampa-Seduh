const fs = require('fs');
const file = './src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove whileHover={{ backgroundColor: "rgba(255,255,255,0.85)" }} and add glow
code = code.replace(
  /whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.85\)" \}\}/g,
  'whileHover={{ scale: 1.02 }}'
);
code = code.replace(
  /className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all"/g,
  'className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,94,60,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-transparent hover:border-amber-500/30"'
);

// Fix package hover
code = code.replace(
  /whileHover=\{\{ y: -8 \}\}/g,
  'whileHover={{ scale: 1.02 }}'
);
code = code.replace(
  /className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200\/50 dark:border-zinc-800\/80 shadow-md flex flex-col justify-between text-left relative"/g,
  'className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md flex flex-col justify-between text-left relative transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,94,60,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:border-amber-500/30"'
);

// 2. Menu Section Background
const oldMenuSection = '<section id="menu-section" className="py-20 bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">';
const newMenuSection = `<section id="menu-section" className="py-20 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px]"></div>
        <div className="relative z-10">`;
code = code.replace(oldMenuSection, newMenuSection);
// Close div for menu section
code = code.replace(
  '        </div>\n      </section>\n\n      {/* Packages Section */}',
  '        </div>\n        </div>\n      </section>\n\n      {/* Packages Section */}'
);

// 3. Packages Section Background
const oldPackSection = '<section id="packages-section" className="py-20 border-t border-amber-900/5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">';
const newPackSection = `<section id="packages-section" className="py-20 border-t border-amber-900/5 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">`;
code = code.replace(oldPackSection, newPackSection);
// Close div for package section
code = code.replace(
  '        </div>\n      </section>\n\n      {/* Edu/Roti Kampung Section */}',
  '        </div>\n        </div>\n      </section>\n\n      {/* Edu/Roti Kampung Section */}'
);

// Fix Dark Mode issues where hardcoded texts are wrong
code = code.replace(/text-zinc-400 hover:text-zinc-650/g, 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300');
code = code.replace(/text-stone-900 dark:text-zinc-200/g, 'text-stone-900 dark:text-zinc-200');

fs.writeFileSync(file, code);
