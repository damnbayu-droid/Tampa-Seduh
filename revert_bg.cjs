const fs = require('fs');
const file = './src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// Menu section replace
const menuStr = `<section id="menu-section" className="py-20 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px] z-0"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">`;

const menuReplacement = `<section id="menu-section" className="py-20 bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">`;

if (code.includes(menuStr)) {
  code = code.replace(menuStr, menuReplacement);
  console.log("Menu section replaced.");
} else {
  console.log("Menu section string not found.");
}

// Packages section replace
const pkgStr = `<section id="packages-section" className="py-20 border-t border-amber-900/5 relative text-stone-900 dark:text-stone-100 transition-colors duration-300" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-[#F9F7F2]/90 dark:bg-zinc-950/90 backdrop-blur-[2px] z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">`;

const pkgReplacement = `<section id="packages-section" className="py-20 border-t border-amber-900/5 bg-[#F9F7F2] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">`;

if (code.includes(pkgStr)) {
  code = code.replace(pkgStr, pkgReplacement);
  console.log("Packages section replaced.");
  
  // Also need to remove the extra </div> that was paired with the relative z-10 div
  // The packages section ends with:
  //         </div>
  //         </div>
  //       </section>
  // Let's replace the last </div></div></section> with </div></section>
  const pkgEndStr = `        </div>\n        </div>\n      </section>\n\n      {/* 4.7 Roti Kampung Education Section */}`;
  const pkgEndReplacement = `        </div>\n      </section>\n\n      {/* 4.7 Roti Kampung Education Section */}`;
  if (code.includes(pkgEndStr)) {
    code = code.replace(pkgEndStr, pkgEndReplacement);
    console.log("Packages section end replaced.");
  } else {
    console.log("Packages section end not found.");
  }
} else {
  console.log("Packages section string not found.");
}

fs.writeFileSync(file, code);
