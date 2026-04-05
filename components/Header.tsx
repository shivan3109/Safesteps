"use client";

import Link from "next/link";
import LogoutButton from "./LogoutButton";

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white py-4 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Dashboard
          </Link>
          <Link href="/run" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Run
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}