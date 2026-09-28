const path = require("node:path");

const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

/**
 * pm2 process definitions for running the back office locally as long-lived
 * services. Three independent apps, safe to run at the same time:
 *
 *   vatana-back-office      :3002  `next start` — production build, build first
 *   vatana-back-office-dev  :3003  `next dev`   — auto-reloads on save (HMR)
 *   vatana-back-office-tunnel      cloudflared  — publishes :3002 to the internet
 *
 * Separate ports, and separate build output too (dev writes to `.next/dev`,
 * production to `.next`), so neither clobbers the other.
 *
 * Note: Next allows only ONE dev server per project directory. If you also run
 * `npm run dev` by hand, the pm2 dev app will exit with "Another next dev
 * server is already running" and restart-loop. Use one or the other.
 *
 * Environment (MONGODB_URI, AUTH_SECRET, S3_*) is not listed here: next
 * loads `.env.local` itself, which keeps secrets out of this committed file.
 */
module.exports = {
  apps: [
    {
      name: "vatana-back-office",
      cwd: __dirname,
      script: nextBin,
      args: "start --port 3002",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "768M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
        // Auth.js only auto-trusts the request host in dev or on Vercel. Under
        // `next start` it otherwise rejects http://localhost:3002 with
        // `UntrustedHost` and login fails. Safe here: the origin is our own.
        AUTH_TRUST_HOST: "true",
      },
      out_file: path.join(__dirname, ".pm2", "out.log"),
      error_file: path.join(__dirname, ".pm2", "error.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "vatana-back-office-dev",
      cwd: __dirname,
      script: nextBin,
      args: "dev --port 3003",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      // The dev server holds the compiler in memory; it needs more headroom
      // than `next start` and grows over a long session.
      max_memory_restart: "2G",
      // No pm2 `watch`: Turbopack already hot-reloads source *and* .env.local,
      // and a pm2-level restart on every keystroke would throw that away.
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: "3003",
        AUTH_TRUST_HOST: "true",
      },
      out_file: path.join(__dirname, ".pm2", "dev-out.log"),
      error_file: path.join(__dirname, ".pm2", "dev-error.log"),
      merge_logs: true,
      time: true,
    },
    {
      // Cloudflare Tunnel: serves vatana-back-office.nandpmuaythai.com from the
      // production app on :3002. Outbound-only — no port forwarding, no inbound
      // firewall rule. Ingress rules live in cloudflared-back-office.yml; the
      // tunnel credentials it points at are in ~/.cloudflared (never committed).
      //
      // Deliberately aimed at :3002 (`next start`) and not the :3003 dev server:
      // this hostname is public, and the dev server is unbuilt and unhardened.
      name: "vatana-back-office-tunnel",
      cwd: __dirname,
      script: "/opt/homebrew/bin/cloudflared",
      args: "tunnel --config cloudflared-back-office.yml run",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      // cloudflared reconnects on its own; back off so a Cloudflare-side outage
      // doesn't turn into a tight pm2 restart loop.
      restart_delay: 5000,
      max_memory_restart: "256M",
      out_file: path.join(__dirname, ".pm2", "tunnel-out.log"),
      error_file: path.join(__dirname, ".pm2", "tunnel-error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
