import React, { useState, useEffect } from "react";
import { BookOpen, User, Calendar, Tag, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BlogNews } from "../types";

import { getApiUrl } from "../lib/api";

export default function CoffeeNews() {
  const [blogs, setBlogs] = useState<BlogNews[]>([]);
  const [activeBlog, setActiveBlog] = useState<BlogNews | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      const res = await fetch(getApiUrl("/api/news"));
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setBlogs(data);
      }
    } catch (err) {
      console.error("Gagal mengambil kopi news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Fetch occasionally
    const interval = setInterval(fetchNews, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="news-section" className="py-20 bg-amber-50/40 dark:bg-zinc-950/20 border-t border-amber-900/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest bg-amber-900/5 dark:bg-amber-400/10 px-3 py-1 rounded-full">Kopi News & Budaya</span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-amber-950 dark:text-amber-100 tracking-tight">Kabar Dari Kebun & Kedai</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Kisah para petani Kotabunan, panduan menyeduh di rumah, dan inspirasi budaya hangat Sulawesi Utara yang kami bagikan untuk kawan sekalian.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-8 h-8 border-4 border-amber-900/20 border-t-amber-900 rounded-full animate-spin"></span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogs.map((blog) => (
              <motion.article
                key={blog.id}
                whileHover={{ y: -6 }}
                className="group relative flex flex-col sm:flex-row bg-white dark:bg-zinc-900/90 border border-amber-900/5 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="relative w-full sm:w-1/3 aspect-[4/3] sm:aspect-auto overflow-hidden">
                  <img
                    src={blog.coverImage || "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400"}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-amber-950/95 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    {blog.category}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                        {blog.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                        {blog.date}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-amber-950 dark:text-amber-100 line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed line-clamp-3">
                      {blog.content}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveBlog(blog)}
                    className="self-start text-xs font-bold text-amber-900 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Selengkapnya
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {/* Reader Lightbox Overview */}
      <AnimatePresence>
        {activeBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-neutral-50 dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-amber-900/10 dark:border-zinc-800"
            >
              <div className="relative h-60 sm:h-72 w-full overflow-hidden">
                <img
                  src={activeBlog.coverImage}
                  alt={activeBlog.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 flex flex-col justify-end p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-500 text-black text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {activeBlog.category}
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight">
                    {activeBlog.title}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveBlog(null)}
                  className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-colors font-bold cursor-pointer"
                  id="btn-close-lightbox"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="flex items-center gap-6 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                    Penulis: <strong className="text-zinc-700 dark:text-zinc-300">{activeBlog.author}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                    Tanggal: <strong className="text-zinc-700 dark:text-zinc-300">{activeBlog.date}</strong>
                  </span>
                </div>

                <div className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap space-y-4">
                  {activeBlog.content}
                </div>
              </div>

              <div className="p-4 bg-zinc-100 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setActiveBlog(null)}
                  className="bg-amber-900 hover:bg-amber-800 text-amber-50 text-xs font-bold px-4 py-2 rounded-xl transition-all font-sans cursor-pointer"
                  id="btn-close-lightbox-footer"
                >
                  Tutup Kabar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
