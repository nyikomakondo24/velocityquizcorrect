# VelocityQuiz

A React quiz app with one Node/Express WebSocket server, supporting one host and up to 60 players per room. No AI API key or database is required.

## Run on your computer

Install Node.js 24 LTS. Extract the ZIP, open a terminal **inside the extracted project folder** (where `package.json` is), then run:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Keep that terminal running. For development, use `npm run dev` instead of the build/start commands.

A phone cannot reach your computer using `localhost`. For a same-Wi-Fi test, open `http://YOUR-COMPUTER-LAN-IP:3000` on the host computer and phones; allow the app through your firewall if needed. The QR code uses the address open in the host's browser. A public deployment is the easier option for an event.

## Host online for free

Use **a Render Free Web Service** for both the website and its Node/WebSocket server. A static-site upload alone cannot run this app's multiplayer server.

1. Create a GitHub repository and upload the extracted project files. Put `package.json` at the repository root. Omit `node_modules` and `dist`.
2. In [Render](https://dashboard.render.com), choose **New → Web Service**, then connect that repository.
3. Apply these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Region | Frankfurt is preselected in the blueprint; test latency with your players |
| Instance type | **Free** |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Environment | `NODE_VERSION=24`, `NODE_ENV=production` |
| Health check path | `/api/health` |
| Auto deploy | Off; deploy between games |

4. Create the service and wait for the deployment to finish. Open its assigned HTTPS address, host a quiz, then share its QR code or `https://YOUR-ADDRESS/?pin=ROOMCODE`.
5. Open the site a couple of minutes before the event, **then create the room**. Keep the host page open. Run a rehearsal from phones before admitting all 60 players.

Alternatively, create a Render Blueprint from this repository; `render.yaml` contains these settings. You still need your own account and repository. This ZIP has not been deployed for you.

Render's current Free plan sleeps after 15 minutes without incoming traffic, takes about a minute to wake, includes 750 instance hours per workspace/month, and has bandwidth/build quotas. It may restart at any time. Without a payment method, exhausted usage can suspend the service rather than bill it. Free hosting is suitable for a trial or casual quiz; it cannot guarantee an uninterrupted event.

Sources checked 17 October 2026: [Free service limits](https://render.com/docs/free), [WebSocket support](https://render.com/docs/websocket), [Web services](https://render.com/docs/web-services), [Blueprint fields](https://render.com/docs/blueprint-spec).

## Recovery and storage

- Refresh or reconnect in the **same browser tab** to recover your player ID, score and answers. Host refresh restores its controls too.
- A disconnected lobby slot is reserved for two minutes. During play, the player stays in the roster; the host can remove them. A host can reconnect for ten minutes before the room expires.
- Session recovery requires the same server process to remain running. Rooms and live scores live in memory: a restart, redeploy or idle shutdown ends them. Run **one server instance**; multiple instances require shared room storage.
- Custom quizzes live in the host browser's local storage, not on the server. Keep original spreadsheets; a different browser, device or website address will not automatically have your saved quizzes.
- Uploaded clue images are resized to WebP (small GIFs remain intact). The server accepts up to 1,000 questions, 2–4 options, 1–300 seconds per question, and an 8 MB room-creation message. Use smaller images or split very large quizzes.
- The client and server protocol changed together. Deploy both from this project and ask players to reload old tabs.

## Verify changes

```sh
npm run lint
npm run build
npm test
```

The automated test starts a separate production server and connects 60 real WebSocket clients. It checks capacity, simultaneous answers, reconnection, host authorization, deadline handling, scoring retries, restarts, and room cleanup. These are local checks, not a measurement of mobile/Wi-Fi performance or Render's Free CPU.

See `OPTIMIZATION.md` for findings and measured results.
