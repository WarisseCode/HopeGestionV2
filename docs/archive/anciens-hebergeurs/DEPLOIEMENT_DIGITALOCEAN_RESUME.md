# 🚀 Deployment Preparation - Quick Reference

## ✅ Files Created

### Configuration Files
- ✅ `.env.production.example` - Environment variables template
- ✅ `.do/app.yaml` - Digital Ocean App Platform configuration
- ✅ `.dockerignore` - Docker ignore rules
- ✅ `backend/Procfile` - Process configuration

### Services & Utilities
- ✅ `backend/services/spacesUploadService.ts` - Digital Ocean Spaces upload service
- ✅ `backend/db/database.ts` - Updated with SSL support for production
- ✅ `backend/scripts/migrate_database.ts` - Database migration tool
- ✅ `backend/routes/UPLOAD_MIGRATION_EXAMPLE.ts` - Upload route migration examples

### Documentation
- ✅ `DEPLOYMENT.md` - Complete deployment guide
- ✅ `deploy-helper.sh` - Deployment helper script

### Package Updates
- ✅ Added `aws-sdk` dependency for Spaces
- ✅ Added database migration scripts to package.json

---

## 🎯 Next Steps

### 1. Generate Secrets
```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Create Digital Ocean Resources

#### PostgreSQL Database
1. Dashboard → Create → Databases → PostgreSQL
2. Region: Frankfurt (fra1)
3. Plan: Basic 1GB (~$15/month)
4. Save connection string

#### Spaces (Object Storage)
1. Dashboard → Create → Spaces
2. Name: `hopegestion-uploads`
3. Region: fra1
4. Enable CDN
5. Generate access keys (API → Spaces Keys)

### 3. Deploy to App Platform

1. **Dashboard → Create → Apps**
2. **Connect GitHub** → Select `HopeGestionV2` repo
3. **Configure Components:**

   **Backend:**
   - Source: `/backend`
   - Build: `npm install && npm run build`
   - Run: `npm start`
   - Port: 8080
   - Instance: Basic 512MB

   **Frontend:**
   - Source: `/frontend`
   - Build: `npm install && npm run build`
   - Output: `dist`
   - Route: `/*` → `/index.html`

4. **Set Environment Variables** (use `.env.production.example` as reference)

### 4. Migrate Database

```bash
# Set production DB URL in local .env
PRODUCTION_DATABASE_URL=postgresql://...

# Run migration
npm run db:full-migration
```

---

## 📦 Database Migration Commands

```bash
# Export local database
npm run db:export

# Import to production
npm run db:import

# Backup production
npm run db:backup-prod

# Run migrations
npm run db:migrate

# Full migration (backup → export → import)
npm run db:full-migration
```

---

## 🔧 Upload Routes Migration

Update your existing upload routes to use Spaces:

1. Replace `multer({ dest: 'uploads/' })` with `multerMemoryStorage`
2. Replace `file.path` with `await uploadToSpaces(file, 'folder')`
3. Update database to store Spaces URLs

See `backend/routes/UPLOAD_MIGRATION_EXAMPLE.ts` for examples.

---

## 💰 Estimated Monthly Cost

| Service | Cost |
|---------|------|
| Backend (512MB) | $5 |
| Frontend (Static) | Free |
| PostgreSQL (1GB) | $15 |
| Spaces (250GB) | $5 |
| **Total** | **~$25/month** |

---

## 📚 Documentation

- **Full Guide**: See `DEPLOYMENT.md`
- **Upload Examples**: See `backend/routes/UPLOAD_MIGRATION_EXAMPLE.ts`
- **Environment Template**: See `.env.production.example`

---

## ⚠️ Important Notes

1. **SSL Required**: Production database requires SSL (already configured)
2. **CORS**: Update CORS origins after deployment
3. **File Uploads**: Migrate to Spaces before production use
4. **Environment Variables**: Never commit real secrets to git
5. **Database Backup**: Always backup production before migration

---

## 🆘 Quick Troubleshooting

### Build Fails
- Check `package.json` scripts
- Verify all dependencies are in `dependencies`, not `devDependencies`

### Database Connection Fails
- Ensure `DATABASE_URL` includes `?sslmode=require`
- Check connection string format

### File Uploads Fail
- Verify Spaces credentials
- Check bucket permissions (public-read)

---

## ✅ Pre-Deployment Checklist

- [ ] Generated JWT secret
- [ ] Created PostgreSQL database on Digital Ocean
- [ ] Created Spaces bucket
- [ ] Generated Spaces access keys
- [ ] Pushed code to GitHub
- [ ] Configured App Platform components
- [ ] Set all environment variables
- [ ] Tested builds locally
- [ ] Exported local database
- [ ] Ready to deploy!

---

**🎉 You're ready to deploy to Digital Ocean!**

Follow the steps in `DEPLOYMENT.md` for detailed instructions.
