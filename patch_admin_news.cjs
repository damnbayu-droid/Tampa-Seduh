const fs = require('fs');
const file = './src/components/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add handleDeleteNews and handleUploadNewsImage logic, and replace handleAddNews
const oldAddNews = `  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl("/api/news"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNews)
      });
      if (res.ok) {
        setIsNewsOpen(false);
        setNewNews({
          title: "", content: "", author: "Emat Ambarak",
          coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
          category: "Tips Seduh"
        });
        setRefreshKey(p => p + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };`;

const newAddNews = `  const [isUploadingNewsImage, setIsUploadingNewsImage] = useState(false);
  const handleUploadNewsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNewsImage(true);
    try {
      const ext = file.name.split('.').pop();
      const uniqueName = \`news-\${Date.now()}-\${Math.floor(Math.random() * 1000)}.\${ext}\`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(uniqueName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from("products")
        .getPublicUrl(uniqueName);
        
      setNewNews({ ...newNews, coverImage: publicUrlData.publicUrl });
      showNotif("Gambar berita berhasil diunggah", "success");
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal unggah gambar", "error");
    } finally {
      setIsUploadingNewsImage(false);
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("blog_news").insert({
        title: newNews.title,
        content: newNews.content,
        author: newNews.author,
        cover_image: newNews.coverImage,
        category: newNews.category
      });
      if (error) throw error;
      
      showNotif("Berita berhasil ditambahkan!", "success");
      setIsNewsOpen(false);
      setNewNews({
        title: "", content: "", author: "Emat Ambarak",
        coverImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
        category: "Tips Seduh"
      });
      setRefreshKey(p => p + 1);
    } catch (err: any) {
      console.error(err);
      showNotif(err.message || "Gagal menambah berita", "error");
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Hapus berita ini?")) return;
    try {
      const { error } = await supabase.from("blog_news").delete().eq("id", id);
      if (error) throw error;
      showNotif("Berita berhasil dihapus!", "success");
      setRefreshKey(p => p + 1);
    } catch (err: any) {
      console.error(err);
      showNotif("Gagal menghapus berita", "error");
    }
  };`;

code = code.replace(oldAddNews, newAddNews);

// 2. Add Image Upload UI in Kopi News Form
const oldImageInput = `                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Link Cover Foto</label>
                          <input
                            type="text"
                            value={newNews.coverImage}
                            onChange={(e) => setNewNews({ ...newNews, coverImage: e.target.value })}
                            className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                          />
                        </div>`;

const newImageInput = `                        <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cover Foto</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newNews.coverImage}
                              onChange={(e) => setNewNews({ ...newNews, coverImage: e.target.value })}
                              className="w-full text-xs px-3 py-2 border dark:bg-zinc-800 rounded-xl"
                              placeholder="URL atau Unggah..."
                            />
                            <input type="file" id="news-img-upload" accept="image/*" className="hidden" onChange={handleUploadNewsImage} />
                            <label htmlFor="news-img-upload" className="shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200 cursor-pointer rounded-xl transition-all" title="Unggah Foto">
                              {isUploadingNewsImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                            </label>
                          </div>
                        </div>`;

code = code.replace(oldImageInput, newImageInput);

// 3. Add Delete Button to News List
const oldNewsListRight = `<div className="text-right flex flex-col justify-between items-end">
                          <span className="text-xs text-zinc-400">{post.date}</span>
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Editor: {post.author}</span>
                        </div>`;

const newNewsListRight = `<div className="text-right flex flex-col justify-between items-end">
                          <span className="text-xs text-zinc-400">{post.date}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-amber-950 dark:text-amber-200">Editor: {post.author}</span>
                            <button onClick={() => handleDeleteNews(post.id)} className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors cursor-pointer" title="Hapus Berita">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>`;

code = code.replace(oldNewsListRight, newNewsListRight);

fs.writeFileSync(file, code);
