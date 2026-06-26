import { io, type Socket } from "socket.io-client";
import { env } from "./env";
import { useAuthStore } from "./auth-store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  const token = useAuthStore.getState().accessToken;
  socket = io(env.SOCKET_URL, {
    auth: {
      token,
      deviceLabel:
        typeof window !== "undefined"
          ? `Web — ${navigator.userAgent.split(") ")[0].slice(-40)}`
          : "Web",
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  // re-attach token on store changes
  useAuthStore.subscribe((state) => {
    if (socket && state.accessToken) {
      socket.auth = {
        ...(socket.auth as object),
        token: state.accessToken,
      };
    }
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
