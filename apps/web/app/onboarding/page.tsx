"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, projectName, projectKey }),
      });
      const data = await res.json();
      if (data.projectId) {
        router.push(`/projects/${data.projectId}/issues`);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-lyght-white flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-[2px] flex-1 transition-colors duration-300 ${
                s <= step ? "bg-lyght-orange" : "bg-lyght-grey-300"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
                WELCOME TO LYGHT
              </h1>
              <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
                AI plans the work. You approve. Agents execute.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Your Name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!name.trim() || !email.trim()}
              className="w-full"
            >
              CONTINUE
            </Button>
          </div>
        )}

        {/* Step 2: Project */}
        {step === 2 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
                CREATE PROJECT
              </h1>
              <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
                Every project needs a name and a short key for issue prefixes.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Project Name"
                placeholder="My Awesome Project"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  if (!projectKey || projectKey === projectName.slice(0, 3).toUpperCase()) {
                    setProjectKey(e.target.value.slice(0, 3).toUpperCase());
                  }
                }}
                autoFocus
              />
              <Input
                label="Project Key"
                placeholder="MAP"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value.toUpperCase().slice(0, 5))}
                maxLength={5}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                BACK
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!projectName.trim() || !projectKey.trim()}
                className="flex-1"
              >
                CONTINUE
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
                READY TO GO
              </h1>
              <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
                We&apos;ll set up your project with sample issues to get you started.
              </p>
            </div>
            <div className="border border-lyght-grey-300/20 p-4 flex flex-col gap-2 rounded-lg">
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Name</span>
                <span className="text-[13px] text-lyght-black">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Email</span>
                <span className="text-[13px] text-lyght-black">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Project</span>
                <span className="text-[13px] text-lyght-black">{projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Key</span>
                <span className="text-[13px] text-lyght-orange">{projectKey}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                BACK
              </Button>
              <Button onClick={handleComplete} loading={loading} className="flex-1">
                LAUNCH
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
