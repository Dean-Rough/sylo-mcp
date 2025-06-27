import { prisma } from './prisma'

export async function getUser(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: { connections: true },
  })
}

export async function createUser(data: {
  clerkId: string
  email: string
  firstName?: string | null
  lastName?: string | null
}) {
  return prisma.user.create({
    data,
  })
}

export async function getUserConnections(userId: string) {
  return prisma.oAuthConnection.findMany({
    where: { userId, isActive: true },
  })
}

export async function createConnection(data: {
  userId: string
  service: string
  connectionId: string
  scopes: string[]
  expiresAt: Date
}) {
  return prisma.oAuthConnection.create({
    data: {
      ...data,
      isActive: true,
    },
  })
}
