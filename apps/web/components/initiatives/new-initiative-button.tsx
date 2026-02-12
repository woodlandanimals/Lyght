"use client";

export function NewInitiativeButton() {
  return (
    <button
      onClick={() =>
        document.dispatchEvent(new CustomEvent("open-create-initiative"))
      }
      className="inline-flex items-center px-4 py-2 bg-lyght-orange text-white text-[13px] font-mono uppercase tracking-[0.05em] font-medium hover:bg-lyght-orange/90 transition-colors rounded-md cursor-pointer"
    >
      + NEW PROJECT
    </button>
  );
}
