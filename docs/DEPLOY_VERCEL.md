# Deploy the Web/PWA to Vercel

## From a Git repository

1. Import the repository in Vercel.
2. Select Framework Preset **Vite**.
3. Use build command `npm run build`.
4. Use output directory `dist`.
5. Do not add environment variables; none are required.
6. Deploy and load the site once while online.

`vercel.json` routes unknown paths to `index.html` and sets security/referrer/permission headers. Vite generates the manifest and versioned Workbox service worker. An in-app prompt appears when an updated shell is ready.

## Verify

Install the site from Chrome/Edge or Safari's Add to Home Screen. Create a test shift, switch the browser offline, reload, add another record, reconnect, and confirm both records remain. Confirm no network call contains record content.

IndexedDB is tied to the exact deployment origin. Preview URLs, custom domains, and production domains have separate data. Avoid changing the production domain after real use without first exporting complete backups.

The service worker caches only immutable application assets. User records remain in IndexedDB and are never replaced by deployment cache updates.
