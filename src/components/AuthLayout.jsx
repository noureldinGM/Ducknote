import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f6] px-4 py-8">
      <div className="absolute -right-20 top-10 h-60 w-60 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <div className="mb-7 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.25rem] bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-200"><Icon className="h-6 w-6" /></div>
          <h1 className="mt-5 font-heading text-3xl font-black text-rose-950">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-rose-500">{subtitle}</p>}
        </div>
        <div className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_24px_70px_-35px_rgba(159,18,57,.5)] backdrop-blur sm:p-8">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-rose-400">{footer}</p>}
      </div>
    </div>
  );
}