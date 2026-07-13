"use client";



export default function Header() {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div>
        <p className="text-cyan-400 uppercase tracking-[0.25em] text-sm font-semibold">
          Identity & Access Control
        </p>

        <h1 className="mt-2 text-4xl font-bold text-white">
          User Management
        </h1>

        <p className="mt-3 text-slate-400 text-lg max-w-3xl">
          Manage stakeholders, identities, authentication,
          permissions and security compliance across the
          organization.
        </p>
      </div>

      <button className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-xl text-white font-semibold shadow-lg shadow-cyan-500/20 transition">
        + Register User
      </button>
    </div>
  );
}