const fs = require('fs');
const file = './src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const beanComponent = `
const CoffeeBean = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6 text-[#4B3621]/40 dark:text-[#8B5E3C]/60"}>
    <path d="M12.015 22.003c-5.518 0-9.99-4.472-9.99-9.99 0-5.519 4.472-9.99 9.99-9.99 5.518 0 9.99 4.471 9.99 9.99 0 5.518-4.472 9.99-9.99 9.99zm-2.825-15.65c-2.31 1.706-3.328 4.646-2.585 7.464a7.18 7.18 0 0 0 2.392 3.79c.925-2.898 3.513-5.01 6.643-5.46-1.573-2.92-4.14-4.88-6.45-5.794zM16.51 16c2.09-1.875 2.87-4.75 2-7.464-1.127.818-2.348 1.95-3.414 3.42-1.07 1.48-1.996 3.32-2.146 5.374 1.344-.12 2.58-.6 3.56-1.33z" />
  </svg>
);
`;

code = code.replace(/import \{ supabase \} from "\.\/lib\/supabase";/, 'import { supabase } from "./lib/supabase";\n' + beanComponent);

// Replace the emojis
code = code.replace(/<span className="text-lg rotate-12">🫘<\/span>/g, '<span className="rotate-12"><CoffeeBean className="w-5 h-5 text-amber-900/30" /></span>');
code = code.replace(/<span className="text-2xl -rotate-45">🫘<\/span>/g, '<span className="-rotate-45"><CoffeeBean className="w-7 h-7 text-amber-900/40" /></span>');
code = code.replace(/<span className="text-base rotate-45">🫘<\/span>/g, '<span className="rotate-45"><CoffeeBean className="w-4 h-4 text-amber-900/20" /></span>');
code = code.replace(/<span className="text-xl -rotate-12">🫘<\/span>/g, '<span className="-rotate-12"><CoffeeBean className="w-6 h-6 text-amber-900/30" /></span>');

code = code.replace(/<span className="text-xl rotate-45">🫘<\/span>/g, '<span className="rotate-45"><CoffeeBean className="w-6 h-6 text-amber-900/30" /></span>');
code = code.replace(/<span className="text-lg -rotate-12">🫘<\/span>/g, '<span className="-rotate-12"><CoffeeBean className="w-5 h-5 text-amber-900/30" /></span>');
code = code.replace(/<span className="text-2xl rotate-12">🫘<\/span>/g, '<span className="rotate-12"><CoffeeBean className="w-7 h-7 text-amber-900/40" /></span>');

code = code.replace(/<span className="text-2xl rotate-12">🫘<\/span>/g, '<span className="rotate-12"><CoffeeBean className="w-7 h-7 text-amber-900/40" /></span>');
code = code.replace(/<span className="text-lg rotate-45">🫘<\/span>/g, '<span className="rotate-45"><CoffeeBean className="w-5 h-5 text-amber-900/30" /></span>');
code = code.replace(/<span className="text-xl -rotate-45">🫘<\/span>/g, '<span className="-rotate-45"><CoffeeBean className="w-6 h-6 text-amber-900/40" /></span>');

code = code.replace(/<span>🫘<\/span>/g, '<CoffeeBean className="w-4 h-4 text-stone-500 inline-block" />');

fs.writeFileSync(file, code);
