 
"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";

export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold text-foreground font-serif mb-4 pb-2 border-b border-border/20">
        {title}
      </h2>
      <div className="prose prose-sm prose-invert max-w-none space-y-4 text-sm text-foreground leading-relaxed
        [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3
        [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-foreground-subtle [&_h4]:mt-6 [&_h4]:mb-2
        [&_p]:text-foreground/90 [&_p]:leading-relaxed
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5
        [&_li]:text-foreground/90
        [&_code]:bg-background-subtle/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-accent
        [&_pre]:bg-background-panel [&_pre]:border [&_pre]:border-border/20 [&_pre]:rounded [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:font-mono
        [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:mb-4
        [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-border/30 [&_th]:bg-background-panel/50 [&_th]:font-bold [&_th]:font-sans [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-foreground-subtle
        [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/10 [&_td]:text-foreground/90
        [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 p-3 rounded-md border border-info/20 bg-info/5 text-xs text-foreground/90">
      <Info size={14} className="text-info shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 p-3 rounded-md border border-destructive/20 bg-destructive/5 text-xs text-foreground/90">
      <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
