# Connect This Project to Replit (via GitHub)

Your Replit project: **http://replit.com/@ausdisau1/AccessiBooks**

Replit uses **GitHub** for Git. To sync this local folder with that Replit project:

---

## 1. Install Git (if needed)

- Download: https://git-scm.com/download/win  
- Run the installer and ensure **"Git from the command line and also from 3rd-party software"** is selected so `git` is on your PATH.

---

## 2. In Replit: Connect to GitHub

1. Open your Replit project: http://replit.com/@ausdisau1/AccessiBooks  
2. In the left sidebar, open **Version Control** (or **Tools → Git**).  
3. Click **Connect to GitHub** (or **+** → GitHub).  
4. Create a **new** GitHub repo for this project (e.g. `AccessiBooks`) or choose an existing one.  
5. Replit will link the repl to that repo. Note the repo URL, e.g. `https://github.com/ausdisau1/AccessiBooks.git`.

---

## 3. On Your PC: Connect This Folder to That Repo

Open PowerShell or Command Prompt in this project folder (`AccessiBooksREPL`) and run:

```powershell
cd "D:\New folder\AccessiBooksREPL"

# One-time setup
git init
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/AccessiBooks.git
git branch -M main
git add .
git commit -m "Initial commit: AccessiBooks local project"
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME/AccessiBooks` with the **exact** GitHub repo URL you used in Replit (e.g. `ausdisau1/AccessiBooks`).

---

## 4. After First Push

- **Replit**: In Version Control, use **Pull** (or sync) to get your local changes.  
- **Local**: To push later: `git add .` → `git commit -m "message"` → `git push`.

---

## If You Already Have a GitHub Repo URL

If Replit is already connected to a repo, just run (with your URL):

```powershell
cd "D:\New folder\AccessiBooksREPL"
git init
git remote add origin https://github.com/ausdisau1/AccessiBooks.git
git branch -M main
```

Then add, commit, and push when ready.
