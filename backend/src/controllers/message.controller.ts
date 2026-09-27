import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created, ok } from "../utils/apiResponse";
import { messageQuerySchema } from "../validators/message.validator";
import * as messagingService from "../services/messaging.service";

export const listMyConversations = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await messagingService.listMyConversations(req.user!.id), "My conversations");
});

export const getOrCreateConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await messagingService.getOrCreateConversation(req.user!.id, req.body);
  created(res, conversation, "Conversation ready");
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await messagingService.getConversationForUser(req.user!.id, req.params.id);
  ok(res, conversation, "Conversation");
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const query = messageQuerySchema.parse(req.query);
  ok(res, await messagingService.listMessages(req.user!.id, req.params.id, query), "Messages");
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  created(res, await messagingService.sendMessage(req.user!.id, req.params.id, req.body), "Message sent");
});

export const markConversationRead = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await messagingService.markConversationRead(req.user!.id, req.params.id), "Conversation marked read");
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await messagingService.getUnreadCount(req.user!.id), "Unread messages");
});