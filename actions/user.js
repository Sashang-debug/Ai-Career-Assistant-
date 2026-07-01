"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

async function getOrCreateDbUser(userId) {
  console.log("Authenticated User:", userId);

  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  console.log("Database User (lookup by clerkUserId):", user);

  if (!user) {
    const clerkUser = await currentUser();
    console.log("Clerk currentUser:", clerkUser);

    if (!clerkUser) {
      throw new Error("Authentication succeeded but Clerk currentUser() returned null");
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");

    let userByEmail = null;
    if (email) {
      userByEmail = await db.user.findUnique({
        where: { email },
      });
      console.log("Database User (lookup by email):", userByEmail);
    }

    if (userByEmail) {
      if (userByEmail.clerkUserId && userByEmail.clerkUserId !== userId) {
        console.warn(
          "Clerk ID mismatch for existing email record:",
          userByEmail.clerkUserId,
          "vs",
          userId,
          "- reusing existing user record by email"
        );
      }

      user = await db.user.update({
        where: { email },
        data: {
          clerkUserId: userId,
          name: userByEmail.name || name || undefined,
          imageUrl: clerkUser.imageUrl || userByEmail.imageUrl,
        },
      });

      console.log("Reused existing user record for email and updated clerkUserId:", user);
    } else {
      user = await db.user.create({
        data: {
          clerkUserId: userId,
          email: email ?? `${userId}@clerk.local`,
          name: name || undefined,
          imageUrl: clerkUser.imageUrl,
        },
      });

      console.log("Created database user record:", user);
    }
  }

  return user;
}

export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getOrCreateDbUser(userId);

  try {
    // Start a transaction to handle both operations
    const result = await db.$transaction(
      async (tx) => {
        // First check if industry exists
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry doesn't exist, create it with default values
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await db.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Now update the user
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // default: 5000
      }
    );

    revalidatePath("/dashboard");
    return result.user;
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await getOrCreateDbUser(userId);

  try {
    return {
      isOnboarded: !!user.industry,
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}