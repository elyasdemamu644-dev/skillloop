import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validation.middleware";
import {
  createConversationSchema,
  sendMessageSchema,
} from "../validators/message.validator";
import * as messageController from "../controllers/message.controller";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);
conversationsRouter.get("/", messageController.listMyConversations);
conversationsRouter.post("/", validateBody(createConversationSchema), messageController.getOrCreateConversation);
conversationsRouter.get("/unread-count", messageController.getUnreadCount);
conversationsRouter.get("/:id", messageController.getConversation);
conversationsRouter.get("/:id/messages", messageController.listMessages);
conversationsRouter.post("/:id/messages", validateBody(sendMessageSchema), messageController.sendMessage);
conversationsRouter.post("/:id/read", messageController.markConversationRead);