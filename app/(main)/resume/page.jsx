import { getResume } from "@/actions/resume";
import ResumeBuilder from "./_components/resume-builder";

function parseInitialAnalysis(resume) {
  if (!resume?.feedback) return null;

  try {
    return JSON.parse(resume.feedback);
  } catch {
    return null;
  }
}

export default async function ResumePage() {
  const resume = await getResume();

  return (
    <div className="container mx-auto py-6">
      <ResumeBuilder
        initialContent={resume?.content}
        initialAnalysis={parseInitialAnalysis(resume)}
      />
    </div>
  );
}