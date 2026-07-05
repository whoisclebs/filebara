import Peer, { type DataConnection } from "peerjs";
import { serializeMessage, deserializeMessage } from "$lib/protocol/schema.js";
import type { ProtocolMessage } from "$lib/protocol/messages.js";

export {
  PeerTransport,
  type PeerTransportOptions,
  type PeerEventMap,
  type ConnectionInfo,
};

/**
 * Options for initializing a PeerTransport instance.
 */
interface PeerTransportOptions {
  peerId?: string;
  iceServers?: RTCIceServer[];
}

/**
 * Events emitted by PeerTransport.
 */
interface PeerEventMap {
  connected: { peerId: string };
  disconnected: { peerId: string };
  data: { peerId: string; payload: unknown };
  error: { peerId: string; error: Error };
}

/**
 * Information about an active peer connection.
 */
interface ConnectionInfo {
  peerId: string;
  conn: DataConnection;
}

/**
 * PeerJS transport wrapper that supports both hosting (sender) and
 * connecting (receiver) roles with typed message serialization.
 */
class PeerTransport {
  private _peer: Peer | null = null;
  private _options: PeerTransportOptions;
  /** Callback for incoming connections (sender listens for receivers). */
  private _onIncomingConn: ((conn: ConnectionInfo) => void) | null = null;
  /** Callback for incoming data on a specific connection. */
  private _onData: ((peerId: string, payload: unknown) => void) | null = null;
  /** Callback for connection-level errors. */
  private _onError: ((peerId: string, error: Error) => void) | null = null;
  /** Active connections keyed by peer ID. */
  private _connections = new Map<string, DataConnection>();

  constructor(options: PeerTransportOptions) {
    this._options = options;
  }

  /**
   * Initialize the PeerJS peer.
   * If peerId is provided, that ID is registered with PeerJS Cloud.
   * If no peerId is provided, PeerJS auto-assigns one.
   */
  async start(): Promise<string> {
    const peerId = this._options.peerId;
    const options = { config: { iceServers: this._options.iceServers } };
    this._peer = peerId ? new Peer(peerId, options) : new Peer(options);

    const assignedId: string = await new Promise((resolve, reject) => {
      this._peer!.on("open", (pid) => resolve(pid));
      this._peer!.on("error", (err) => reject(err));
    });

    // Set up incoming connection listener
    this._peer.on("connection", (conn: DataConnection) => {
      this._setupConnection(conn);
      if (this._onIncomingConn) {
        this._onIncomingConn({ peerId: conn.peer, conn });
      }
    });

    return assignedId;
  }

  /**
   * Register a handler for incoming connections (sender role).
   */
  onIncomingConnection(handler: (conn: ConnectionInfo) => void): void {
    this._onIncomingConn = handler;
  }

  /**
   * Register a handler for incoming data messages.
   */
  onData(handler: (peerId: string, payload: unknown) => void): void {
    this._onData = handler;
  }

  /**
   * Register a handler for connection errors.
   */
  onError(handler: (peerId: string, error: Error) => void): void {
    this._onError = handler;
  }

  /**
   * Connect to a remote peer by ID (receiver role).
   * Returns once the connection is established.
   */
  async connect(remotePeerId: string): Promise<ConnectionInfo> {
    if (!this._peer) throw new Error("PeerTransport not started");

    const conn = this._peer.connect(remotePeerId, { reliable: true });
    await new Promise<void>((resolve, reject) => {
      conn.on("open", () => resolve());
      conn.on("error", (err) => reject(err));
    });

    this._setupConnection(conn);
    return { peerId: conn.peer, conn };
  }

  /**
   * Send a typed protocol message over a data connection.
   * Serializes the message with version checking.
   */
  sendMessage(conn: DataConnection, msg: ProtocolMessage): void {
    const serialized = serializeMessage(msg);
    conn.send(serialized);
  }

  /**
   * Send a raw string/JSON payload over a data connection.
   */
  sendRaw(conn: DataConnection, data: string): void {
    conn.send(data);
  }

  /**
   * Get all active connection peer IDs.
   */
  get connectedPeers(): string[] {
    return Array.from(this._connections.keys());
  }

  /**
   * Get a specific connection by peer ID.
   */
  getConnection(peerId: string): DataConnection | undefined {
    return this._connections.get(peerId);
  }

  /**
   * Close a specific connection.
   */
  closeConnection(peerId: string): void {
    const conn = this._connections.get(peerId);
    if (conn) {
      conn.close();
      this._connections.delete(peerId);
    }
  }

  /**
   * Clean up the PeerJS instance and all connections.
   */
  destroy(): void {
    for (const [, conn] of this._connections) {
      conn.close();
    }
    this._connections.clear();
    this._peer?.destroy();
    this._peer = null;
  }

  // ── Private helpers ──

  private _setupConnection(conn: DataConnection): void {
    this._connections.set(conn.peer, conn);

    conn.on("data", (data: unknown) => {
      if (this._onData) {
        this._onData(conn.peer, data);
      }
    });

    conn.on("close", () => {
      this._connections.delete(conn.peer);
    });

    conn.on("error", (err) => {
      if (this._onError) {
        this._onError(conn.peer, err);
      }
    });
  }
}
