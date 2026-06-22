const fs = require('fs');
const file = './src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Menu Section
// Original:
// <section id="menu-section" className="py-20 bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
//   <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
const menuRegex = /<section id="menu-section" className="py-20 bg-\[#F9F7F2\] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">([\s\S]*?)<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">/g;

code = code.replace(menuRegex, `<section id="menu-section" className="py-20 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>$1<div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px] z-0"></div>\n        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">`);

// Close the extra div for Menu Section
// Search for:
//         </div>
//       </section>
// 
//       {/* 4.5 Coffee Packages Section */}
code = code.replace(
  '        </div>\n      </section>\n\n      {/* 4.5 Coffee Packages Section */}',
  '        </div>\n        </div>\n      </section>\n\n      {/* 4.5 Coffee Packages Section */}'
);


// 2. Packages Section
const packRegex = /<section id="packages-section" className="py-20 border-t border-amber-900\/5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">/g;
code = code.replace(packRegex, `<section id="packages-section" className="py-20 border-t border-amber-900/5 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>\n        <div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px] z-0"></div>\n        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">`);

// Close the extra div for Packages Section
code = code.replace(
  '        </div>\n      </section>\n\n      {/* 4.7 Roti Kampung Education Section */}',
  '        </div>\n        </div>\n      </section>\n\n      {/* 4.7 Roti Kampung Education Section */}'
);

// 3. Hover effects Menu Card
code = code.replace(
  /whileHover=\{\{ backgroundColor: "rgba\(255,255,255,0\.85\)" \}\}/g,
  'whileHover={{ scale: 1.02 }}'
);
code = code.replace(
  /className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all"/g,
  'className="bg-white dark:bg-zinc-900 p-5 sm:p-6 flex justify-between items-center relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,94,60,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-transparent hover:border-amber-500/30"'
);

// 4. Hover effects Package Card
code = code.replace(
  /whileHover=\{\{ y: -8 \}\}/g,
  'whileHover={{ scale: 1.02 }}'
);
code = code.replace(
  /className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200\/50 dark:border-zinc-800\/80 shadow-md flex flex-col justify-between text-left relative"/g,
  'className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 shadow-md flex flex-col justify-between text-left relative transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,94,60,0.3)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-transparent hover:border-amber-500/30"'
);

// 5. Dark mode fixes
code = code.replace(/text-zinc-400 hover:text-zinc-650/g, 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300');
code = code.replace(/text-stone-900 dark:text-zinc-200/g, 'text-stone-900 dark:text-zinc-200');

fs.writeFileSync(file, code);
