"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error);
    throw new Error("Failed to improve content");
  }
}

function parseJsonResponse(text) {
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(cleanedText);
}

export async function optimizeResumeForJob(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const resumeContent =
    data.resumeContent ||
    (
      await db.resume.findUnique({
        where: { userId: user.id },
      })
    )?.content;

  if (!resumeContent?.trim()) {
    throw new Error("Add resume content before optimizing for a job");
  }

  const prompt = `
    You are an expert ATS resume optimizer and career coach.

    Analyze the candidate's resume against the job description below.
    Identify keyword matches and gaps, then produce an optimized resume that naturally incorporates missing keywords without keyword stuffing.

    Candidate profile:
    - Industry: ${user.industry || "Not specified"}
    - Experience: ${user.experience ?? "Not specified"} years
    - Skills: ${user.skills?.join(", ") || "Not specified"}
    - Top industry skills: ${user.industryInsight?.topSkills?.join(", ") || "Not specified"}

    ${data.jobTitle ? `Target role: ${data.jobTitle}` : ""}
    ${data.companyName ? `Target company: ${data.companyName}` : ""}

    Job description:
    ${data.jobDescription}

    Current resume (markdown):
    ${resumeContent}

    Return ONLY valid JSON in this exact format:
    {
      "atsScore": 75,
      "matchedKeywords": ["keyword1", "keyword2"],
      "missingKeywords": ["keyword3", "keyword4"],
      "suggestions": [
        {
          "section": "Skills",
          "recommendation": "Specific actionable suggestion"
        }
      ],
      "optimizedContent": "Full optimized resume in markdown format"
    }

    Rules:
    1. atsScore is 0-100 based on keyword alignment and role fit
    2. matchedKeywords: important terms from the job description already present in the resume
    3. missingKeywords: important terms from the job description absent or weak in the resume
    4. suggestions: 3-5 specific, actionable improvements
    5. optimizedContent: complete resume markdown preserving structure, contact info, and truthfulness while improving keyword alignment
  `;

  try {
    const result = await model.generateContent(prompt);
    const analysis = parseJsonResponse(result.response.text());

    await db.resume.upsert({
      where: { userId: user.id },
      update: {
        atsScore: analysis.atsScore,
        feedback: JSON.stringify(analysis),
      },
      create: {
        userId: user.id,
        content: resumeContent,
        atsScore: analysis.atsScore,
        feedback: JSON.stringify(analysis),
      },
    });

    revalidatePath("/resume");
    return analysis;
  } catch (error) {
    console.error("Error optimizing resume:", error);
    throw new Error("Failed to optimize resume for this job");
  }
}