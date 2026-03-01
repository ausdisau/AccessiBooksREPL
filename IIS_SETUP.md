# Run AccessiBooks on localhost via IIS (Option B)

IIS listens on port 80; the Node app runs on port 5000. IIS forwards every request to Node so you open **http://localhost/** and get the app.

## Option B quick checklist

1. **Start Node on port 5000** (in project folder):
   ```powershell
   cd "D:\New folder\AccessiBooksREPL"
   npm run dev
   ```
   Leave this running. You should see `serving on http://localhost:5000`.

2. **IIS:** Install **URL Rewrite** and **Application Request Routing (ARR)**. In ARR, enable **proxy**.

3. **IIS:** Add a **website** with physical path = this project folder, binding **http**, port **80**. The `web.config` in the folder will proxy all requests to `http://localhost:5000`.

4. **Browser:** Open **http://localhost** (or **http://localhost:80**). If you see the app, Option B is working.

## Prerequisites

- **Node.js** (LTS) and npm installed
- **IIS** with:
  - **URL Rewrite** module ([download](https://www.iis.net/downloads/microsoft/url-rewrite))
  - **Application Request Routing (ARR)** with “Proxy” enabled ([download](https://www.iis.net/downloads/microsoft/application-request-routing))

## 1. Start the Node app (backend)

From the project root (e.g. `D:\New folder\AccessiBooksREPL`):

**Development (Vite + API on one port):**
```powershell
$env:NODE_ENV="development"; $env:PORT="5000"; npx tsx server/index.ts
```
Or if you use `cross-env`:
```powershell
npm run dev
```

**Production (after build):**
```powershell
npm run build
$env:PORT="5000"; node dist/index.js
```

Leave this running. The app listens on `http://localhost:5000` (or `http://localhost:80` if you set `PORT=80` and run with sufficient privileges).

## 2. Enable proxy in IIS (ARR)

1. Open **IIS Manager** → select the **server** (machine name), not a site.
2. Double-click **Application Request Routing Cache**.
3. Right side: **Server Proxy Settings**.
4. Check **Enable proxy**.
5. Click **Apply**.

## 3. Create the IIS site

1. In IIS Manager, **Sites** → **Add Website**.
2. **Site name:** e.g. `AccessiBooks`.
3. **Physical path:** project folder (e.g. `D:\New folder\AccessiBooksREPL`). The `web.config` in this folder is used.
4. **Binding:** 
   - Type: `http`
   - Port: `80` (or e.g. `8080` if 80 is in use)
   - Host name: leave empty for “localhost”, or set `localhost`.
5. Click **OK**.

## 4. Use the app

- With port 80: open **http://localhost** (or **http://localhost:80**).
- With another port (e.g. 8080): open **http://localhost:8080**.

IIS forwards every request to `http://localhost:5000`. The Node app must be running (step 1) or you’ll get 502 Bad Gateway.

## 5. CORS / allowed origins (if needed)

If you use a host/port in IIS (e.g. `http://localhost:80`), ensure the Node app allows that origin. In `.env` or environment:

```env
ALLOWED_ORIGIN=http://localhost
```

The app’s CORS in `server/routes.ts` already includes `http://localhost:3000` and `http://localhost:5000`. For `http://localhost` (port 80) add:

```env
ALLOWED_ORIGIN=http://localhost
```

## Troubleshooting

- **502 Bad Gateway:** Node app not running or not on port 5000. Start it (step 1) and check `PORT` (default 5000).
- **404 / wrong page:** URL Rewrite or ARR not installed/enabled. Recheck step 2 and that `web.config` is in the site’s physical path.
- **Static/API errors:** Ensure the site’s physical path is the project root so `web.config` is read; the app itself is served by Node, IIS only proxies.
