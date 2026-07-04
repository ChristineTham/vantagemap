"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
        <h2 className="text-xl font-bold text-rosely-night">Invalid Link</h2>
        <p className="mt-2 text-sm text-rosely-mist">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-rosely-plum hover:text-rosely-mauve"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await authClient.resetPassword({
        newPassword: password,
        token: token!,
      });

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-rosely-teal/20">
            <KeyRound className="size-6 text-rosely-teal" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-rosely-night">Password Reset</h2>
          <p className="mt-2 text-sm text-rosely-mist">
            Your password has been updated. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
      <h2 className="text-xl font-bold text-rosely-night">Set New Password</h2>
      <p className="mt-1 text-sm text-rosely-mist">Enter your new password below</p>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-rosely-mist hover:text-rosely-night"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-rosely-mist">Minimum 8 characters</p>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="mt-1"
            placeholder="••••••••"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-rosely-plum hover:bg-rosely-mauve text-white"
        >
          {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Reset Password
        </Button>
      </form>
    </div>
  );
}
