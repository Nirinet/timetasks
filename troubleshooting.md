# 🔧 TimeTask - מדריך פתרון בעיות מקיף

## 🚨 בעיות נפוצות בהתקנה

### 1. npm install נכשל

#### תסמינים:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

#### פתרון:
```bash
# נקה את npm cache
npm cache clean --force

# מחק node_modules
rm -rf node_modules package-lock.json
rm -rf server/node_modules server/package-lock.json
rm -rf client/node_modules client/package-lock.json

# התקן עם legacy peer deps
npm install --legacy-peer-deps
cd server && npm install --legacy-peer-deps
cd ../client && npm install --legacy-peer-deps
```

---

### 2. Prisma Client Generation Errors

#### תסמינים:
```
Error: Cannot find module '@prisma/client'
```

#### פתרון:
```bash
cd server

# מחק את הclient הישן
rm -rf node_modules/@prisma
rm -rf node_modules/.prisma

# התקן מחדש
npm install @prisma/client prisma

# צור מחדש את הclient
npx prisma generate

# אם עדיין לא עובד
npx prisma generate --force
```

---

### 3. TypeScript Compilation Errors

#### תסמינים:
```
Cannot find module '@/utils/logger'
tsconfig.json(1,1): error TS1084
```

#### פתרון:
```bash
# התקן tsconfig-paths
cd server
npm install --save-dev tsconfig-paths

# נקה build ישן
rm -rf dist

# בנה מחדש
npm run build
```

---

### 4. Database Connection Errors

#### תסמינים:
```
PrismaClientInitializationError: Can't reach database server
```

#### פתרון:
```bash
# בדוק שPostgreSQL רץ
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # Mac

# התחל PostgreSQL אם לא רץ
sudo systemctl start postgresql  # Linux
brew services start postgresql  # Mac

# בדוק חיבור
psql -U postgres -c "SELECT 1"

# אם הבעיה בהרשאות
sudo -u postgres psql
CREATE USER timetask WITH PASSWORD 'your_password';
CREATE DATABASE timetask OWNER timetask;
GRANT ALL PRIVILEGES ON DATABASE timetask TO timetask;
\q

# עדכן את DATABASE_URL ב-server/.env
DATABASE_URL="postgresql://timetask:your_password@localhost:5432/timetask?schema=public"
```

---

### 5. Port Already in Use

#### תסמינים:
```
Error: listen EADDRINUSE: address already in use :::3000
```

#### פתרון:
```bash
# מצא את התהליך
# Linux/Mac:
lsof -i :3000
kill -9 <PID>

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# או שנה את הפורט ב-.env
PORT=3001  # server/.env
```

---

### 6. Module Resolution Errors

#### תסמינים:
```
Module not found: Error: Can't resolve '@mui/material'
```

#### פתרון:
```bash
# וודא שהתקנת בתיקייה הנכונה
cd client
npm install

# אם עדיין לא עובד
npm install --force @mui/material @emotion/react @emotion/styled
```

---

### 7. Winston Logger Errors

#### תסמינים:
```
Cannot find module 'winston-daily-rotate-file'
```

#### פתרון:
השתמש בקוד המעודכן של logger.ts שלא דורש את החבילה הזו.

---

### 8. Socket.IO Connection Failed

#### תסמינים:
```
WebSocket connection to 'ws://localhost:3000/socket.io/' failed
```

#### פתרון:
```bash
# בדוק את CORS settings
# server/src/index.ts - וודא שה-CORS מוגדר נכון

# client/.env
VITE_SOCKET_URL=http://localhost:3000  # לא להוסיף /socket.io

# אם משתמש ב-HTTPS
VITE_SOCKET_URL=https://yourdomain.com
```

---

### 9. JWT Authentication Errors

#### תסמינים:
```
JsonWebTokenError: invalid signature
```

#### פתרון:
```bash
# צור JWT secrets חדשים
openssl rand -base64 32

# עדכן ב-server/.env
JWT_SECRET=<הסוד החדש>
REFRESH_TOKEN_SECRET=<סוד אחר>

# הפעל מחדש את השרת
```

---

### 10. Migration Errors

#### תסמינים:
```
Error: P3006: Migration already applied
```

#### פתרון:
```bash
cd server

# איפוס מלא (זהירות - ימחק את כל הנתונים!)
npx prisma migrate reset --force

# או תיקון ידני
npx prisma migrate resolve --applied <migration_name>

# צור מחדש
npx prisma migrate dev
```

---

## 🐧 בעיות ספציפיות ל-Linux

### Permission Denied
```bash
# תן הרשאות
chmod +x install.sh
chmod -R 755 server/uploads
chmod -R 755 server/logs

# אם צריך sudo
sudo chown -R $USER:$USER .
```

### PostgreSQL Authentication Failed
```bash
# ערוך את pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# שנה מ-peer ל-md5
local   all             all                                     md5

# הפעל מחדש
sudo systemctl restart postgresql
```

---

## 🍎 בעיות ספציפיות ל-Mac

### PostgreSQL via Homebrew
```bash
# התקנה
brew install postgresql@14
brew services start postgresql@14

# יצירת database
createdb timetask

# אם יש בעיה
brew services restart postgresql@14
brew postgresql-upgrade-database
```

### Node Version Issues
```bash
# השתמש ב-nvm
nvm install 18
nvm use 18
nvm alias default 18
```

---

## 🪟 בעיות ספציפיות ל-Windows

### Scripts Policy Error
```powershell
# פתח PowerShell כ-Admin
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Too Long
```bash
# השתמש ב-Git Bash או WSL2
# או קצר את הpath
npm config set cache "C:\npm-cache" --global
```

### PostgreSQL Installation
```bash
# הורד מ-https://www.postgresql.org/download/windows/
# השתמש ב-pgAdmin לניהול

# או דרך chocolatey
choco install postgresql14
```

---

## 🐳 בעיות Docker

### Docker Compose Fails
```bash
# נקה containers ישנים
docker-compose down -v
docker system prune -a

# בנה מחדש
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection in Docker
```yaml
# docker-compose.yml
DATABASE_URL=postgresql://postgres:password@postgres:5432/timetask
# לא localhost!
```

---

## 🔥 בעיות Performance

### Slow npm install
```bash
# שנה registry
npm config set registry https://registry.npmmirror.com

# או השתמש ב-yarn
yarn install
```

### High Memory Usage
```bash
# הגבל את Node.js
NODE_OPTIONS="--max-old-space-size=2048" npm run dev

# בPM2
pm2 start app.js --max-memory-restart 1G
```

---

## 📋 Checklist לבדיקה מהירה

```bash
# הרץ את health check
node scripts/health-check.js
```

בדיקות ידניות:
- [ ] Node.js 18+ מותקן
- [ ] PostgreSQL רץ
- [ ] server/.env מוגדר
- [ ] DATABASE_URL נכון
- [ ] כל node_modules מותקנים
- [ ] Prisma client נוצר
- [ ] פורטים 3000, 5173 פנויים
- [ ] JWT secrets מוגדרים

---

## 🆘 אם כלום לא עוזר

### Reset מלא:
```bash
#!/bin/bash
# reset.sh

# עצור הכל
pkill -f node

# מחק הכל
rm -rf node_modules server/node_modules client/node_modules
rm -rf server/dist client/dist
rm -rf server/prisma/migrations
rm -rf server/logs/* server/uploads/*
rm package-lock.json server/package-lock.json client/package-lock.json

# התקן מחדש
npm run setup

echo "System reset complete!"
```

### Debug Mode:
```bash
# הרץ עם debug
DEBUG=* npm run dev

# Prisma debug
DEBUG="prisma:*" npx prisma migrate dev

# Node debug
NODE_ENV=development LOG_LEVEL=debug npm run dev
```

---

## 📞 קבלת עזרה

1. **בדוק את הלוגים:**
   ```bash
   tail -f server/logs/error.log
   cat server/logs/combined.log | grep ERROR
   ```

2. **צור issue report:**
   - גרסת Node.js: `node -v`
   - גרסת npm: `npm -v`
   - מערכת הפעלה: `uname -a` או `systeminfo`
   - תוכן הלוג המלא
   - שלבים לשחזור הבעיה

3. **נסה בסביבה נקייה:**
   ```bash
   # צור תיקייה חדשה
   git clone <repo> timetask-clean
   cd timetask-clean
   npm run setup
   ```

---

## ✅ בדיקת הצלחה

אחרי פתרון הבעיה, וודא:

1. **Health check עובר:**
   ```bash
   node scripts/health-check.js
   # All checks passed!
   ```

2. **שרת עולה בלי שגיאות:**
   ```
   ✅ Database connected successfully
   🚀 Server running on port 3000
   ```

3. **Client עולה:**
   ```
   VITE v5.0.10  ready in XXX ms
   ```

4. **ניתן להתחבר:**
   - http://localhost:5173
   - Login עובד

---

**עדכון אחרון:** דצמבר 2024
**גרסה:** 1.0.1