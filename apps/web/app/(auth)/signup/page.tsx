"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Step = 1 | 2 | 3 | 4;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");

  // Step 2: Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 3: Workspace + Project
  const [workspaceName, setWorkspaceName] = useState("Engineering");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");

  function validateStep2(): string | null {
    if (!name.trim()) return "Name is required";
    if (!email.trim() || !email.includes("@")) return "Valid email is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }

  async function handleComplete() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          name,
          email,
          password,
          workspaceName,
          projectName,
          projectKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      if (data.projectId) {
        router.push(`/projects/${data.projectId}/issues`);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-[2px] flex-1 transition-colors duration-300 ${
              s <= step ? "bg-lyght-orange" : "bg-lyght-grey-300"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="text-[13px] text-lyght-red font-mono bg-lyght-red/5 border border-lyght-red/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Step 1: Organization */}
      {step === 1 && (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
              CREATE ORGANIZATION
            </h1>
            <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
              Your organization is your team&apos;s home in Lyght.
            </p>
          </div>
          <Input
            label="Organization Name"
            placeholder="Acme Inc"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setError("");
                setStep(2);
              }}
              disabled={!orgName.trim()}
              className="w-full"
            >
              CONTINUE
            </Button>
            <p className="text-[13px] text-lyght-grey-500 font-mono text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-lyght-orange hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Account */}
      {step === 2 && (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
              YOUR ACCOUNT
            </h1>
            <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
              Set up your personal account for {orgName}.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Input
              label="Full Name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              placeholder="jane@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
              BACK
            </Button>
            <Button
              onClick={() => {
                const err = validateStep2();
                if (err) {
                  setError(err);
                  return;
                }
                setError("");
                setStep(3);
              }}
              disabled={!name.trim() || !email.trim() || !password}
              className="flex-1"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Workspace + Project */}
      {step === 3 && (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
              FIRST WORKSPACE
            </h1>
            <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
              Workspaces group projects so teams can focus. Create your first one.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Input
              label="Workspace Name"
              placeholder="Engineering"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              autoFocus
            />
            <Input
              label="First Project Name"
              placeholder="My Awesome Project"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (!projectKey || projectKey === projectName.slice(0, 3).toUpperCase()) {
                  setProjectKey(e.target.value.slice(0, 3).toUpperCase());
                }
              }}
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
            <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
              BACK
            </Button>
            <Button
              onClick={() => {
                setError("");
                setStep(4);
              }}
              disabled={!workspaceName.trim() || !projectName.trim() || !projectKey.trim()}
              className="flex-1"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-[28px] font-mono font-bold text-lyght-black leading-[1.2]">
              READY TO GO
            </h1>
            <p className="text-[13px] text-lyght-grey-500 mt-2 font-mono">
              Review your setup and launch.
            </p>
          </div>
          <div className="border border-lyght-grey-300/20 p-4 flex flex-col gap-2 rounded-lg">
            <div className="flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Organization</span>
              <span className="text-[13px] text-lyght-black">{orgName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Name</span>
              <span className="text-[13px] text-lyght-black">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Email</span>
              <span className="text-[13px] text-lyght-black">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[11px] uppercase tracking-[0.1em] text-lyght-grey-500">Workspace</span>
              <span className="text-[13px] text-lyght-black">{workspaceName}</span>
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
            <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
              BACK
            </Button>
            <Button onClick={handleComplete} loading={loading} className="flex-1">
              LAUNCH
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
