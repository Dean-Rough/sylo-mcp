import { currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  return prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { connections: true },
  })
}

export async function createUserFromClerk(clerkUser: any) {
  return prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
  })
}

export async function ensureUserExists() {
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { connections: true },
  })

  if (!user) {
    await createUserFromClerk(clerkUser)
    // Refetch with connections
    user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { connections: true },
    })
  }

  return user
}
