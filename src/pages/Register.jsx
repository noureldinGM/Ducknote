import React from "react";
import { Link } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AppButton from "@/components/system/AppButton";

export default function Register() {
  return (
    <AuthLayout icon={LockKeyhole} title="DuckNote is invite-only" subtitle="Accounts are created by an administrator.">
      <p className="text-center text-sm leading-6 text-rose-500">This keeps every note inside a small, trusted circle.</p>
      <AppButton asChild className="mt-6 w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white"><Link to="/login">Back to login</Link></AppButton>
    </AuthLayout>
  );
}