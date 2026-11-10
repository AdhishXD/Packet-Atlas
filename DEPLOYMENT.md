# Deploying Packet Atlas

## What GitHub Pages can host

GitHub Pages can deploy the complete visual frontend: the globe, Learn course, interactive labs, animations, and quizzes. The included workflow publishes it whenever `main` is updated.

GitHub Pages cannot run `server.mjs`, shell commands, or `traceroute`. A Pages-only deployment therefore cannot measure live hops. It will explain that the live API is unavailable instead of displaying an invented path.

## Publish the frontend with GitHub Pages

1. Open the repository on GitHub.
2. Choose **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Open the **Actions** tab and run **Deploy frontend to GitHub Pages**, or push a new commit to `main`.
5. GitHub will publish the site at `https://adhishxd.github.io/Packet-Atlas/`.

The workflow installs D3, assembles only the public frontend files in `_site`, and deploys that directory.

The repository must have Pages enabled before `actions/configure-pages` runs. A `Get Pages site: Not Found` error means step 3 has not been completed yet; it is a repository setting, not a website build error.

## Keep live Trace search working

Deploy the Node server to a host that supports long-running Node processes and the system `traceroute` command. A small VPS is the most predictable option; some serverless and managed hosts block raw network probes.

Set these environment variables on the backend:

```text
PORT=4173
ALLOWED_ORIGIN=https://adhishxd.github.io
TRACE_TIMEOUT_MS=9000
TRACE_MAX_HOPS=18
```

Check `https://YOUR-BACKEND/api/health`. It should return `{ "ok": true, "traceroute": true }`.

Then edit `config.js`:

```js
window.PACKET_ATLAS_API_BASE = 'https://YOUR-BACKEND';
```

Commit and push that change. The next Pages deployment will send Trace requests to the backend. Restrict `ALLOWED_ORIGIN` to the exact frontend origin rather than `*` in production.

## One-host alternative

The simplest fully functional deployment is a Node-capable VPS or container host running `npm start`. In that setup the frontend and API share one origin, `config.js` stays empty, and GitHub remains the source repository and deployment trigger.
