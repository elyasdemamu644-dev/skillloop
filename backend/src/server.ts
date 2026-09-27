import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { setupSocketServer } from "./sockets";

async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Socket.IO is initialized here so it shares the same HTTP server. Messaging
  // and notification handlers live in src/sockets/.
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  setupSocketServer(io);

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 SkillLoop API listening on http://localhost:${env.PORT}`);
    console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
