"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Only allow same-origin relative redirects. Rejects absolute URLs (`https://…`),
 * protocol-relative (`//evil.com`), and anything not starting with a single `/`,
 * preventing an open-redirect via `?callbackUrl=`.
 */
function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-8 shadow-sm">
      <h2 className="text-xl font-bold text-rosely-night">Sign In</h2>
      <p className="mt-1 text-sm text-rosely-mist">Enter your credentials to access VantageMap</p>

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

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm text-rosely-plum hover:text-rosely-mauve"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-rosely-plum hover:bg-rosely-mauve text-white"
        >
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-rosely-mist">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-rosely-plum hover:text-rosely-mauve">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
