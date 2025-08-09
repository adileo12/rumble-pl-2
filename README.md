# Rumble PL — GitHub → Vercel

## 1) Push to GitHub
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<your-user>/rumble-pl.git
git push -u origin main

## 2) Import to Vercel
- Add New → Project → select repo
- Env Vars:
  - DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.YOUR_HOST.supabase.co:5432/postgres?sslmode=require
  - NEXT_PUBLIC_SITE_NAME = Rumble
- Deploy (Node 20.x recommended)

## 3) Initialize
- Visit /admin → Seed DB → Sync Fixtures
- Visit /api/status
