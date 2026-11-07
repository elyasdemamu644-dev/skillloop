import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../middleware/error.middleware";
import { MATERIALS_DIR } from "../utils/multer";
import { createNotification } from "./notification.service";
import { InsufficientFundsError, applyWalletEntry } from "./wallet.service";
import type {
  CreateMaterialInput,
  MaterialListQuery,
  UpdateMaterialInput,
} from "../validators/material.validator";

const USER_BRIEF = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

const MATERIAL_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  fileNames: true,
  links: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: USER_BRIEF },
  skill: { select: { id: true, name: true, slug: true, category: { select: { id: true, name: true, slug: true } } } },
  _count: { select: { purchases: true } },
} as const;

const PURCHASE_SELECT = {
  id: true,
  materialId: true,
  buyerId: true,
  pricePaid: true,
  createdAt: true,
  payment: { select: { id: true, status: true } },
  material: { select: MATERIAL_SELECT },
} as const;

function deleteDiskFiles(fileNames: string[]) {
  for (const name of fileNames) {
    const target = path.join(MATERIALS_DIR, name);
    if (target.startsWith(MATERIALS_DIR) && fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // Never fail the API because a stray file could not be cleaned up.
      }
    }
  }
}

export async function listMaterials(query: MaterialListQuery, viewerId?: string) {
  const where: Prisma.MaterialWhereInput = { isActive: true };
  if (query.skillId) {
    const skill = await prisma.skill.findUnique({ where: { id: query.skillId }, select: { id: true } });
    if (!skill) throw new ApiError(404, "Skill not found");
    where.skillId = query.skillId;
  }

  const [items, total] = await prisma.$transaction([
    prisma.material.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: MATERIAL_SELECT,
    }),
    prisma.material.count({ where }),
  ]);

  let purchasedIds = new Set<string>();
  if (viewerId && items.length > 0) {
    const purchases = await prisma.materialPurchase.findMany({
      where: { buyerId: viewerId, materialId: { in: items.map((item) => item.id) } },
      select: { materialId: true },
    });
    purchasedIds = new Set(purchases.map((p) => p.materialId));
  }

  return {
    items: items.map((item) => ({
      ...item,
      // Flatten the relation count so clients get a stable field name.
      purchaseCount: item._count.purchases,
      purchased: purchasedIds.has(item.id),
      own: item.teacher.id === viewerId,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function listMyMaterials(userId: string) {
  const materials = await prisma.material.findMany({
    where: { teacherId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      ...MATERIAL_SELECT,
      purchases: {
        select: { id: true, pricePaid: true, createdAt: true, buyer: { select: USER_BRIEF } },
      },
    },
  });
  return materials.map(({ purchases, ...material }) => ({
    ...material,
    purchaseCount: purchases.length,
    revenue: purchases.reduce((sum, purchase) => sum + purchase.pricePaid, 0),
    buyers: purchases,
  }));
}

export async function createMaterial(teacherId: string, input: CreateMaterialInput, files: Express.Multer.File[]) {
  if (input.skillId) {
    const skill = await prisma.skill.findUnique({ where: { id: input.skillId }, select: { id: true } });
    if (!skill) throw new ApiError(404, "Skill not found");
  }
  return prisma.material.create({
    data: {
      teacherId,
      skillId: input.skillId,
      title: input.title,
      description: input.description,
      price: input.price,
      fileNames: files.map((file) => file.filename),
      links: input.links ?? [],
    },
    select: MATERIAL_SELECT,
  });
}

export async function updateMaterial(
  userId: string,
  materialId: string,
  input: UpdateMaterialInput,
  files: Express.Multer.File[],
  clearFiles: boolean
) {
  const existing = await prisma.material.findFirst({
    where: { id: materialId, teacherId: userId },
    select: { id: true, fileNames: true, skillId: true, links: true },
  });
  if (!existing) throw new ApiError(404, "Material not found");

  if (input.skillId) {
    const skill = await prisma.skill.findUnique({ where: { id: input.skillId }, select: { id: true } });
    if (!skill) throw new ApiError(404, "Skill not found");
  }

  let fileNames = existing.fileNames;
  if (files.length > 0) {
    deleteDiskFiles(existing.fileNames);
    fileNames = files.map((file) => file.filename);
  } else if (clearFiles) {
    deleteDiskFiles(existing.fileNames);
    fileNames = [];
  }

  const { skillId, links, ...rest } = input;
  return prisma.material.update({
    where: { id: existing.id },
    data: {
      ...rest,
      skillId: skillId === undefined ? existing.skillId : skillId,
      links: links === undefined ? existing.links : links,
      fileNames,
    },
    select: MATERIAL_SELECT,
  });
}

export async function deleteMaterial(userId: string, materialId: string) {
  const existing = await prisma.material.findFirst({
    where: { id: materialId, teacherId: userId },
    select: { id: true, fileNames: true, _count: { select: { purchases: true } } },
  });
  if (!existing) throw new ApiError(404, "Material not found");
  if (existing._count.purchases > 0) {
    throw new ApiError(
      409,
      "This material has purchases. Hide it instead of deleting it so buyers keep access."
    );
  }
  await prisma.material.delete({ where: { id: existing.id } });
  deleteDiskFiles(existing.fileNames);
}

export async function listLibrary(userId: string) {
  return prisma.materialPurchase.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    select: PURCHASE_SELECT,
  });
}

export async function purchaseMaterial(buyerId: string, materialId: string) {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      title: true,
      price: true,
      isActive: true,
      teacherId: true,
      teacher: { select: USER_BRIEF },
    },
  });
  if (!material || !material.isActive) throw new ApiError(404, "Material not found");
  if (material.teacherId === buyerId) throw new ApiError(400, "You cannot buy your own material");

  const existing = await prisma.materialPurchase.findUnique({
    where: { materialId_buyerId: { materialId, buyerId } },
    select: PURCHASE_SELECT,
  });
  if (existing) return existing;

  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { firstName: true, lastName: true },
  });
  if (!buyer) throw new ApiError(404, "User not found");

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: buyerId,
          recipientId: material.teacherId,
          materialId: material.id,
          amount: material.price,
          method: "CREDITS",
          status: "COMPLETED",
          completedAt: new Date(),
          description: `Purchase: ${material.title}`,
        },
        select: { id: true, status: true },
      });

      // Both sides of the purchase go through the ledger, so the transfer is
      // auditable and the debit guard is atomic (no overdraft when two
      // purchases race on the same wallet).
      if (material.price > 0) {
        await applyWalletEntry(tx, {
          userId: buyerId,
          type: "MATERIAL_PURCHASE",
          amount: -material.price,
          paymentId: payment.id,
          description: `Purchase: ${material.title}`,
        });
        await applyWalletEntry(tx, {
          userId: material.teacherId,
          type: "MATERIAL_SALE",
          amount: material.price,
          paymentId: payment.id,
          description: `Sale: ${material.title}`,
        });
      }

      return tx.materialPurchase.create({
        data: {
          materialId: material.id,
          buyerId,
          paymentId: payment.id,
          pricePaid: material.price,
        },
        select: PURCHASE_SELECT,
      });
    });
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      throw new ApiError(400, "Insufficient wallet balance. Top up in Payments first.");
    }
    throw error;
  }

  await Promise.all([
    createNotification({
      userId: material.teacherId,
      type: "material",
      title: `You sold "${material.title}"`,
      body: `${buyer.firstName} ${buyer.lastName} paid ${material.price} credits.`,
      data: { href: "/materials" },
    }),
    createNotification({
      userId: buyerId,
      type: "material",
      title: `Purchase complete: ${material.title}`,
      body: `${material.price} credits paid. The materials are in your library.`,
      data: { href: "/materials" },
    }),
  ]);

  return result;
}

export async function getDownloadPath(userId: string, materialId: string, fileName: string) {
  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, teacherId: true, fileNames: true },
  });
  if (!material) throw new ApiError(404, "Material not found");
  if (!material.fileNames.includes(fileName)) throw new ApiError(404, "File not found");

  if (material.teacherId !== userId) {
    const purchase = await prisma.materialPurchase.findUnique({
      where: { materialId_buyerId: { materialId, buyerId: userId } },
      select: { id: true },
    });
    if (!purchase) throw new ApiError(403, "You must buy this material before downloading its files");
  }

  const resolved = path.join(MATERIALS_DIR, fileName);
  if (!resolved.startsWith(MATERIALS_DIR) || !fs.existsSync(resolved)) {
    throw new ApiError(404, "File not found on disk");
  }
  return resolved;
}