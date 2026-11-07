import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/services/socket";

// Keeps the notification badge/list fresh whenever the backend pushes a new
// notification over the socket (message, session, exchange, review, badge...).
//
// Only connects while `enabled` (i.e. the user is signed in): opening a socket
// with no token just produces failing handshakes on public pages. Reconnection
// is left to Socket.IO, whose auth callback re-reads the current access token
// on every attempt — so a rotated token is picked up automatically.
export function useNotificationsRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;

    const socket = getSocket();
    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [enabled, queryClient]);
}
