"use client";

/**
 * Phase 10.2 — User Profile & Settings Page
 *
 * Allows users to view and update their profile (name, email),
 * change password, and manage notification preferences.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { authClient } from "@/lib/auth-client";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/api";
import { User, Lock, Bell, Save, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/Skeleton";

type Tab = "profile" | "password" | "notifications";

export default function ProfilePage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  if (isPending) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="mt-6 h-64 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "password", label: "Password", icon: Lock },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-rosely-mist hover:text-rosely-night"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-rosely-night">Profile & Settings</h1>
        <p className="mt-1 text-sm text-rosely-mist">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-rosely-blush bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-rosely-petal text-rosely-plum"
                : "text-rosely-dusk hover:text-rosely-night"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-2xl">
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "password" && <PasswordTab />}
        {activeTab === "notifications" && <NotificationsTab />}
      </div>
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: { name: string; email: string } }) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await authClient.updateUser({ name });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-6">
      <h2 className="text-lg font-bold text-rosely-night">Personal Information</h2>
      <p className="mt-1 text-sm text-rosely-mist">Update your name and display preferences</p>

      {success && (
        <div className="mt-4 rounded-lg border border-rosely-teal/30 bg-rosely-teal/10 px-4 py-3 text-sm text-rosely-teal">
          Profile updated successfully
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user.email}
            disabled
            className="mt-1 bg-rosely-cream/50 text-rosely-mist"
          />
          <p className="mt-1 text-xs text-rosely-mist">Email cannot be changed</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve disabled:opacity-50"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

// ── Password Tab ────────────────────────────────────────────────────────────

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to change password. Is your current password correct?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-6">
      <h2 className="text-lg font-bold text-rosely-night">Change Password</h2>
      <p className="mt-1 text-sm text-rosely-mist">Update your password for security</p>

      {success && (
        <div className="mt-4 rounded-lg border border-rosely-teal/30 bg-rosely-teal/10 px-4 py-3 text-sm text-rosely-teal">
          Password changed successfully
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-rosely-mist">Minimum 8 characters</p>
        </div>

        <div>
          <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
          <Input
            id="confirmNewPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="mt-1"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve disabled:opacity-50"
        >
          <Lock className="size-4" />
          {saving ? "Updating..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}

// ── Notifications Tab ───────────────────────────────────────────────────────

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  emailNotifs: true,
  emailOnSubscribedChange: true,
  emailOnMention: true,
  weeklyDigest: false,
  inAppEnabled: true,
};

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNotificationPreferences()
      .then((res) => {
        if (active) setPrefs(res.data);
      })
      .catch(() => {
        if (active) setError("Failed to load preferences");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof NotificationPreferences>(key: K, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateNotificationPreferences(prefs);
      setPrefs(res.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-6">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="mt-4 h-40 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-6">
      <h2 className="text-lg font-bold text-rosely-night">Notification Preferences</h2>
      <p className="mt-1 text-sm text-rosely-mist">Choose how you want to be notified</p>

      {success && (
        <div className="mt-4 rounded-lg border border-rosely-teal/30 bg-rosely-teal/10 px-4 py-3 text-sm text-rosely-teal">
          Preferences saved
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <ToggleRow
          label="In-App Notifications"
          description="Show notifications inside VantageMap"
          checked={prefs.inAppEnabled}
          onChange={(v) => set("inAppEnabled", v)}
        />
        <ToggleRow
          label="Email Notifications"
          description="Receive notifications via email"
          checked={prefs.emailNotifs}
          onChange={(v) => set("emailNotifs", v)}
        />
        <ToggleRow
          label="Fact Sheet Changes"
          description="Email when fact sheets you subscribe to are modified"
          checked={prefs.emailOnSubscribedChange}
          onChange={(v) => set("emailOnSubscribedChange", v)}
        />
        <ToggleRow
          label="Mentions & Assignments"
          description="Email when you are mentioned or assigned as responsible or accountable"
          checked={prefs.emailOnMention}
          onChange={(v) => set("emailOnMention", v)}
        />
        <ToggleRow
          label="Weekly Digest"
          description="Receive a weekly summary of all changes"
          checked={prefs.weeklyDigest}
          onChange={(v) => set("weeklyDigest", v)}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve disabled:opacity-50"
      >
        <Save className="size-4" />
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}

// ── Toggle Row Helper ───────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-rosely-blush p-4 hover:border-rosely-lilac transition-colors">
      <div>
        <p className="text-sm font-medium text-rosely-night">{label}</p>
        <p className="text-xs text-rosely-mist">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-rosely-blush text-rosely-plum focus:ring-rosely-lilac"
      />
    </label>
  );
}
