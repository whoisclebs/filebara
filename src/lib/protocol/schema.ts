import { type ProtocolMessage, MessageType } from "./messages.js";

export {
  PROTOCOL_VERSION,
  MAX_SUPPORTED_VERSION,
  isVersionSupported,
  serializeMessage,
  deserializeMessage,
  SerializeError,
};

/**
 * Protocol version for forward compatibility.
 * Bump on breaking message schema changes.
 */
const PROTOCOL_VERSION = 1;

/**
 * Maximum supported protocol version the current code can handle.
 * Used to reject messages from a newer peer.
 */
const MAX_SUPPORTED_VERSION = 1;

/**
 * Check whether a message version is compatible with this runtime.
 */
function isVersionSupported(version: number): boolean {
  return version >= 1 && version <= MAX_SUPPORTED_VERSION;
}

/**
 * Error thrown when serialization or deserialization fails.
 */
class SerializeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerializeError";
  }
}

/**
 * Serialize a protocol message to a JSON string.
 * The message must have a valid `type` and `version` field.
 *
 * Throws SerializeError if the message is invalid.
 */
function serializeMessage(msg: ProtocolMessage): string {
  if (!msg.type || typeof msg.type !== "string") {
    throw new SerializeError("Message must have a valid 'type' field");
  }
  if (typeof msg.version !== "number" || msg.version < 1) {
    throw new SerializeError("Message must have a valid 'version' field");
  }
  if (!isVersionSupported(msg.version)) {
    throw new SerializeError(
      `Message version ${msg.version} is not supported (max supported: ${MAX_SUPPORTED_VERSION})`,
    );
  }
  return JSON.stringify(msg);
}

/**
 * Deserialize a JSON string into a protocol message.
 *
 * Returns the parsed message, or throws SerializeError if:
 * - The JSON cannot be parsed
 * - The version is not supported
 * - The type field is missing or unknown
 */
function deserializeMessage(json: string): ProtocolMessage {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new SerializeError("Failed to parse message JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new SerializeError("Message must be a JSON object");
  }

  const version = parsed.version;
  if (typeof version !== "number" || version < 1) {
    throw new SerializeError(
      "Message must have a numeric 'version' field >= 1",
    );
  }

  if (!isVersionSupported(version)) {
    throw new SerializeError(
      `Message version ${version} is not supported (max supported: ${MAX_SUPPORTED_VERSION})`,
    );
  }

  const type = parsed.type;
  if (!type || typeof type !== "string") {
    throw new SerializeError("Message must have a string 'type' field");
  }

  // Ensure the type is a known message type
  const knownTypes = Object.values(MessageType) as string[];
  if (!knownTypes.includes(type)) {
    throw new SerializeError(`Unknown message type: '${type}'`);
  }

  return parsed as unknown as ProtocolMessage;
}
