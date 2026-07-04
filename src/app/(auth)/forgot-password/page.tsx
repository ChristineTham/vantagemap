"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setSubmitted(true);
    } catch {
      // Always show success to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-rosely-teal/20">
            <Mail className="size-6 text-rosely-teal" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-rosely-night">Check Your Email</h2>
          <p className="mt-2 text-sm text-rosely-mist">
            If an account exists with <strong className="text-rosely-night">{email}</strong>,
            you&apos;ll receive a password reset link shortly.
          </p>
          <Link
            href="/login"
            className="mt-6 text-sm font-medium text-rosely-plum hover:text-rosely-mauve"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
      <h2 className="text-xl font-bold text-rosely-night">Reset Password</h2>
      <p className="mt-1 text-sm text-rosely-mist">
        Enter your email and we&apos;ll send you a reset link
      </p>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1"
            placeholder="you@company.com"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-rosely-plum hover:bg-rosely-mauve text-white"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Mail />}
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-rosely-mist">
        Remember your password?{" "}
        <Link href="/login" className="font-medium text-rosely-plum hover:text-rosely-mauve">
          Sign In
        </Link>
      </p>
    </div>
  );
}
