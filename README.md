<p align="center">
  <img src="static/filebara.png" alt="Filebara" width="160" height="160" />
</p>

<h1 align="center">Filebara</h1>

<p align="center">
  <strong>Direct browser-to-browser file sharing — no upload to our servers.</strong>
</p>

<p align="center">
  Transfer files directly between browsers over WebRTC.<br>
  Encrypted, password-protected, open-source.
</p>

---

> This is an MVP (v0.1.0). The protocol and API are not yet stable.

## How It Works

```
Sender                        Receiver
  │                              │
  ├─ Select file + password      │
  ├─ Generate session link ──────┤  (share link out of band)
  │                              ├─ Open link, enter password
  │◄──── PeerJS signaling ──────►│  (small SDP/ICE only)
  │◄───── Auth proof/accept ────►│  (password verified, no metadata leaked yet)
  │◄───── Approval request ─────►│  (sender approves/rejects)
  │◄───── Encrypted chunks ─────►│  (AES-256-GCM, unique nonces per chunk)
  │                              │  File ready to download
```

### Key properties

- **No file upload to our servers.** Files never leave the peers' browsers
  except over the encrypted WebRTC data channel. The PeerJS signaling server
  only exchanges small connection-setup messages (SDP offers, ICE candidates).
  It never sees file contents.

- **The sender tab must stay open.** The transfer only exists while the
  sender's browser tab is active. Closing the sender tab terminates the
  session. No server holds the file in escrow.

- **End-to-end encryption.** Files are encrypted with AES-256-GCM in the
  sender's browser before transmission. Each chunk uses a unique nonce.
  Integrity is guaranteed per-chunk by AES-GCM authentication.

- **Password-protected.** Every transfer requires a password set by the
  sender. The receiver must prove password knowledge (via an Argon2id-derived
  proof) before the sender releases any file metadata.

- **Verification code.** After the receiver enters the password, both sides
  see a short verification code. They should compare codes to confirm they
  are talking to the right person before approving the transfer.

- **PeerJS signaling dependency.** Filebara relies on the PeerJS Cloud
  signaling server for WebRTC connection setup. This is required for the
  peers to discover each other. The signaling server is not involved in file
  data transfer, and a custom PeerJS server can be self-hosted if needed.

- **Single receiver per session.** In the MVP, a session is bound to the
  first approved receiver. Subsequent connection attempts are rejected.

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Open http://localhost:5173 in your browser
# Select a file, enter a password, and share the generated link
```

### Production build

```bash
npm run build
npm run preview
```

The build output is in `build/` and can be served by any static web server.

## Usage

### Sending a file

1. Open Filebara in your browser.
2. Select a file to share.
3. Enter a password (minimum 4 characters).
4. Click **Start**.
5. Share the generated link (copy or QR) with the intended receiver.
6. **Keep the tab open.** The transfer only works while this tab is active.
7. When the receiver connects and requests the file, review the shared
   verification code and click **Approve** to begin the transfer.

### Receiving a file

1. Open the shared Filebara link in your browser.
2. Enter the password set by the sender.
3. Compare the verification code with the sender to confirm the connection.
4. Wait for the sender to approve your request.
5. The file transfers automatically. When complete, click **Download**.

## Limitations (MVP)

### WebRTC connectivity

- Both peers must be able to establish a WebRTC connection. This works on
  most residential and mobile networks but may fail behind symmetric NATs,
  corporate VPNs, or strict firewalls.
- The MVP does not include a TURN relay server. Peers behind symmetric NATs
  may not be able to connect directly.
- A connection to the PeerJS Cloud signaling server is required for session
  setup.

### File size

- Filebara reads files incrementally (256 KiB chunks) but the receiver
  holds the entire decrypted file in memory before download. Very large
  files may exceed available memory on low-end devices.
- There is no resume support for interrupted transfers.
- For best results, use Filebara for files under a few hundred megabytes.

### Browser compatibility

- Requires a modern browser with WebRTC and Web Crypto API support.
- Works on Chrome, Edge, Firefox, and Safari.
- Web Crypto API requires a secure context (HTTPS or localhost).

## Development

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run check     # Type-check with svelte-check
npm run preview   # Preview production build locally
npm run lint      # Run prettier and eslint checks
npm run format    # Format with prettier
```

## Tech Stack

| Area           | Technology                            |
| -------------- | ------------------------------------- |
| Framework      | Svelte 5 + SvelteKit (static adapter) |
| Language       | TypeScript                            |
| P2P transport  | PeerJS (WebRTC DataChannel)           |
| Encryption     | AES-256-GCM (Web Crypto API)          |
| Key derivation | Argon2id (Web Worker)                 |
| QR code        | qrcode (node-qrcode)                  |
| i18n           | Custom store (en, es, pt-BR)          |

## Privacy

Filebara is designed to minimize trust requirements:

1. **No accounts.** No sign-up, no user profiles, no session storage on our
   servers.
2. **No file upload.** Files stay in the sender's browser until encrypted
   and sent directly to the receiver.
3. **No server-side decryption.** The signaling server only sees opaque
   peer IDs. It cannot decrypt chunks.
4. **No logs of file contents.** The signaling server never sees file data.
5. **Password is not stored.** The sender's password is used only for
   key derivation. Neither the password nor the derived key is transmitted
   to any server.

## License

MIT — see [LICENSE](LICENSE) (if present) or the repository root.

---

_Built for tiny, direct browser transfers._
