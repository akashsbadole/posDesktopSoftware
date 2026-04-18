"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/stores";
import {
  registerSchema,
  validateData,
  getValidationErrors,
} from "@/lib/validations";

interface RegistrationScreenProps {
  onBack: () => void;
}

export default function RegistrationScreen({
  onBack,
}: RegistrationScreenProps) {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Trim all inputs to remove whitespace
      const trimmedOrgName = orgName.trim();
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const trimmedConfirmPassword = confirmPassword.trim();

      // Validate using registerSchema
      const validation = validateData(registerSchema, {
        organization_name: trimmedOrgName,
        email: trimmedEmail,
        password: trimmedPassword,
        confirm_password: trimmedConfirmPassword,
      });

      if (!validation.success) {
        const errors = getValidationErrors(validation.errors);
        const errorMessages = Object.values(errors);
        setError(errorMessages[0]); // Show first error
        return;
      }

      setLoading(true);
      setError("");
      console.log(
        "[RegistrationScreen] Submitting registration for:",
        trimmedEmail,
      );
      const success = await register(
        trimmedOrgName,
        trimmedEmail,
        trimmedPassword,
      );
      if (!success) {
        setError("Registration failed. Email might already be in use.");
      }
    } catch (err: any) {
      console.error("[RegistrationScreen] Registration error:", err);
      setError(err?.message || "An error occurred during registration. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#F5C842] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-[#0D0D0F]">POS</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground">100% Free - No payment required</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="orgName"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Organization Name
            </label>
            <input
              id="orgName"
              type="text"
              required
              disabled={loading}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value.trim())}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none disabled:opacity-50"
              placeholder="e.g. My Great Business"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none disabled:opacity-50"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none disabled:opacity-50"
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 6 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl">
            <strong>Default PIN:</strong> 1234 (You'll use this to enter the POS
            at login)
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-[#F5C842] hover:underline"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
