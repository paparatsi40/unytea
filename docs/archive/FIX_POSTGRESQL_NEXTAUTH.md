# 🔧 FIX POSTGRESQL FOR NEXTAUTH

**Status:** Database connection failing  
**Error:** `Authentication failed for user "postgres"`

---

## 🎯 THE PROBLEM

After migrating from Clerk to NextAuth, we need to push the new database schema, but PostgreSQL
authentication is failing.

**What We Know:**

- ✅ PostgreSQL 18 is running on port 5433
- ✅ Database name: `mentorly`
- ❌ Password for `postgres` user doesn't match

---

## 🚀 SOLUTIONS (Try in Order)

### Solution 1: Use PgAdmin to Reset Password (EASIEST)

1. Open **pgAdmin 4** (should be installed with PostgreSQL)
2. Connect to localhost
3. Right-click on `PostgreSQL 18` server
4. Select **"Properties"** →  **"Connection"**
5. Note the current password or reset it
6. Update `.env.local` with the correct password

---

### Solution 2: Find the Correct Password

The password might be in one of these places:

1. **Check pgpass file:**
   ```powershell
   cat $env:APPDATA\postgresql\pgpass.conf
   ```

2. **Check installation notes:**
    - Look for `postgresql_install_log.txt` in Program Files
    - Password might be documented there

3. **Try common passwords:**
   ```
   postgres
   admin
   root
   password
   (empty)
   ```

---

### Solution 3: Reset Password via pg_hba.conf (ADVANCED)

1. **Locate pg_hba.conf:**
   ```
   C:\Program Files\PostgreSQL\18\data\pg_hba.conf
   ```

2. **Backup the file:**
   ```powershell
   Copy-Item "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" "C:\Program Files\PostgreSQL\18\data\pg_hba.conf.backup"
   ```

3. **Edit pg_hba.conf** (as Administrator):
    - Find the line: `host all all 127.0.0.1/32 scram-sha-256`
    - Change to: `host all all 127.0.0.1/32 trust`

4. **Restart PostgreSQL:**
   ```powershell
   Restart-Service postgresql-x64-18
   ```

5. **Connect and reset password:**
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433
   ```

   Then in psql:
   ```sql
   ALTER USER postgres WITH PASSWORD 'postgres';
   \q
   ```

6. **Revert pg_hba.conf:**
    - Change `trust` back to `scram-sha-256`
    - Restart service again

---

### Solution 4: Use PostgreSQL 16 Instead (IF AVAILABLE)

If PostgreSQL 16 is accessible with correct password:

1. **Check if database exists in PG 16:**
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -l
   ```

2. **Update `.env.local`** if needed

---

### Solution 5: Create New PostgreSQL User (RECOMMENDED)

1. **Connect to PostgreSQL** (once you have access):
   ```sql
   CREATE USER mentorly_user WITH PASSWORD 'mentorly_secure_password_2024';
   CREATE DATABASE mentorly OWNER mentorly_user;
   GRANT ALL PRIVILEGES ON DATABASE mentorly TO mentorly_user;
   ```

2. **Update `.env.local`:**
   ```env
   DATABASE_URL="postgresql://mentorly_user:mentorly_secure_password_2024@localhost:5433/mentorly?schema=public"
   ```

---

## ✅ AFTER FIXING PASSWORD

Once you have the correct password in `.env.local`:

```bash
# Push new schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Start dev server
npm run dev
```

**Expected Output:**

```
✔ Generated Prisma Client
✔ The database is now in sync with the Prisma schema

New tables created:
- accounts
- sessions  
- verification_tokens

Updated tables:
- users (removed clerkId, added password, emailVerified, image)
- mentor_sessions (renamed from sessions)
```

---

## 🧪 TEST THE MIGRATION

Once database is working:

1. **Visit:** http://localhost:3000/auth/signup
2. **Create account** with email/password
3. **Check database:**
   ```sql
   SELECT * FROM users;
   ```
4. **Should see:** Your new user with hashed password

---

## 🔒 SECURITY NOTE

After fixing:

1. **Change default password:**
   ```sql
   ALTER USER postgres WITH PASSWORD 'very-secure-random-password';
   ```

2. **Update `.env.local`** with new password

3. **Never commit `.env.local`** to git (it's in .gitignore)

---

## 📞 NEED HELP?

If nothing works:

1. **Check if mentorly database exists:**
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433 -c "\l"
   ```

2. **Check if you can connect at all:**
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433 postgres
   ```

3. **Last resort - Reinstall PostgreSQL:**
    - Uninstall PostgreSQL 18
    - Reinstall and note the password
    - Update `.env.local`

---

## 🎯 QUICK WIN

**Try this FIRST:**

```powershell
# Try connecting with psql
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433

# If it prompts for password, try:
# 1. postgres
# 2. Just press Enter (empty password)
# 3. admin
# 4. The password you set during installation
```

If ANY of these work, that's your password! Update `.env.local` immediately.

---

**Good luck! You're almost there! 🚀**
