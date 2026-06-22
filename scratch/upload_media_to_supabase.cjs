#!/usr/bin/env node
// ============================================================
// Script: Upload foto lokal ke Supabase Storage
// Mengunggah file dari /public/Pamflet → bucket pamflets
// Mengunggah file dari /public/Foto Colage → bucket gallery-photos
// ============================================================

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://yizsanjcyphlbtjcwzxl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpenNhbmpjeXBobGJ0amN3enhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk1MTEzMSwiZXhwIjoyMDk3NTI3MTMxfQ.kyt6hGJTXaYc2ceNsO9KUuh_ziGo0VWaObrrPqXh_aU';

const PAMFLET_DIR = path.join(__dirname, '../public/Pamflet');
const GALLERY_DIR = path.join(__dirname, '../public/Foto Colage');

async function uploadFile(bucket, filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };
  const contentType = mimeTypes[ext] || 'image/webp';
  
  // Bersihkan nama file
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(safeName)}`;

  console.log(`  ⬆ Uploading "${fileName}" → ${bucket}/${safeName}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  ✗ Gagal: ${err}`);
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(safeName)}`;
  console.log(`  ✓ Berhasil: ${publicUrl}`);
  return publicUrl;
}

async function uploadDirectory(bucket, dir, label) {
  console.log(`\n📁 ${label} → bucket: ${bucket}`);
  
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠ Direktori tidak ditemukan: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  });

  if (files.length === 0) {
    console.log('  ⚠ Tidak ada file gambar ditemukan.');
    return;
  }

  console.log(`  Ditemukan ${files.length} file gambar...`);
  let success = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const result = await uploadFile(bucket, filePath, file);
    if (result) success++;
    // Jeda kecil agar tidak rate-limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`  ✅ ${success}/${files.length} file berhasil diupload ke "${bucket}"`);
}

async function main() {
  console.log('🚀 Tampa Seduh — Upload Media ke Supabase Storage');
  console.log('==================================================');

  await uploadDirectory('pamflets', PAMFLET_DIR, 'PAMFLET / BROSUR');
  await uploadDirectory('gallery-photos', GALLERY_DIR, 'FOTO KOLASE STREET COFFEE');

  console.log('\n✅ Selesai! Semua file sudah diupload ke Supabase Storage.');
  console.log('📺 Cek di Admin Dashboard → Foto & Pamflet untuk melihat hasilnya.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
