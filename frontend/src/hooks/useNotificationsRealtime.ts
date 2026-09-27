import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/services/socket";

// Keeps the notification badge/list fresh whenever the backend pushes a new
// notification over the socket (message, session, exchange, review, badge...).
export function useNotificationsRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const onNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [queryClient]);
}