"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Palette, Sliders, Shield, Type, Save } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface ThemePreset {
  key: string;
  name: string;
  desc: string;
  colorClass: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    key: "midnight",
    name: "Midnight Obsidian",
    desc: "Bronze accents on dark slate and platinum surfaces.",
    colorClass: "bg-[#CD7F32]",
  },
  {
    key: "cyberpunk",
    name: "Cyberpunk Bronze",
    desc: "Amber highlights on dark high-contrast panels.",
    colorClass: "bg-[#D97706]",
  },
  {
    key: "emerald",
    name: "Classic Emerald",
    desc: "Mint green accents for corporate compliance views.",
    colorClass: "bg-[#059669]",
  },
  {
    key: "ocean",
    name: "Ocean Breeze",
    desc: "Refined sky blue elements for clear data displays.",
    colorClass: "bg-[#0284c7]",
  },
];

export default function UIUXAdminPage() {
  const [, setConfigMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable configurations state
  const [selectedTheme, setSelectedTheme] = useState("midnight");
  const [glassBlur, setGlassBlur] = useState("20");
  const [glowIntensity, setGlowIntensity] = useState("0.15");
  const [scanlinesOpacity, setScanlinesOpacity] = useState("0.015");
  const [typography, setTypography] = useState("sans");
  const [orgName, setOrgName] = useState("Unggul Axiom");
  const [logoUrl, setLogoUrl] = useState("");
  const [greetingHeader, setGreetingHeader] = useState("Strategic Portal");

  useEffect(() => {
    adminApi
      .getConfig()
      .then((config) => {
        setConfigMap(config);
        setSelectedTheme(config["ui_theme"] || "midnight");
        setGlassBlur(config["ui_glass_blur"] || "20");
        setGlowIntensity(config["ui_glow_intensity"] || "0.15");
        setScanlinesOpacity(config["ui_scanlines_opacity"] || "0.015");
        setTypography(config["ui_typography"] || "sans");
        setOrgName(config["ui_org_name"] || "Unggul Axiom");
        setLogoUrl(config["ui_logo_url"] || "");
        setGreetingHeader(config["ui_greeting_header"] || "Strategic Portal");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = [
        adminApi.updateConfig("ui_theme", selectedTheme),
        adminApi.updateConfig("ui_glass_blur", glassBlur),
        adminApi.updateConfig("ui_glow_intensity", glowIntensity),
        adminApi.updateConfig("ui_scanlines_opacity", scanlinesOpacity),
        adminApi.updateConfig("ui_typography", typography),
        adminApi.updateConfig("ui_org_name", orgName.trim()),
        adminApi.updateConfig("ui_logo_url", logoUrl.trim()),
        adminApi.updateConfig("ui_greeting_header", greetingHeader.trim()),
      ];
      await Promise.all(updates);
      useToastStore.getState().success("UI/UX configuration saved successfully");

      // Dispatch event to redraw parent layouts in real-time
      window.dispatchEvent(new Event("ui-config-update"));
    } catch {
      useToastStore.getState().error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground font-serif">UI/UX Templates Settings</h2>
        <p className="text-xs text-foreground-subtle mt-1">
          Customize corporate colors, themes, layout density, and branding options dynamically.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Themes & Presets */}
        <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/10">
            <Palette size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
              Brand Accent Palette
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {THEME_PRESETS.map((preset) => {
              const isSelected = selectedTheme === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedTheme(preset.key)}
                  className={cn(
                    "flex flex-col items-start text-left p-4 rounded-lg border transition-all cursor-pointer",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border/20 bg-background/30 hover:border-border/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-bold text-foreground font-sans">
                      {preset.name}
                    </span>
                    <div className={cn("h-3 w-3 rounded-full shrink-0 shadow-sm", preset.colorClass)} />
                  </div>
                  <span className="text-[11px] text-foreground-subtle leading-relaxed">
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Layout & Depth Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Glassmorphism */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/10">
              <Sliders size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
                Interface Depth & Blurs
              </h3>
            </div>
            <div className="space-y-4 text-xs">
              {/* Blur */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider">
                  Backdrop Blur strength
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "0", label: "None (0px)" },
                    { val: "8", label: "Soft (8px)" },
                    { val: "20", label: "Medium (20px)" },
                    { val: "32", label: "Deep (32px)" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setGlassBlur(item.val)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-colors cursor-pointer",
                        glassBlur === item.val
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border/30 text-foreground-subtle hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glow */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider">
                  Glow border opacity
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "0", label: "None" },
                    { val: "0.08", label: "Low" },
                    { val: "0.15", label: "Medium" },
                    { val: "0.35", label: "High" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setGlowIntensity(item.val)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-colors cursor-pointer",
                        glowIntensity === item.val
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border/30 text-foreground-subtle hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanlines */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider">
                  Scan-lines grid opacity
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: "0", label: "Off" },
                    { val: "0.01", label: "Low" },
                    { val: "0.015", label: "Medium" },
                    { val: "0.04", label: "High" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setScanlinesOpacity(item.val)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-colors cursor-pointer",
                        scanlinesOpacity === item.val
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border/30 text-foreground-subtle hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Column B: Typography & Branding */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/10">
              <Type size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
                Typography settings
              </h3>
            </div>
            <div className="space-y-4 text-xs">
              {/* Fonts */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider">
                  Global font family
                </label>
                <div className="flex gap-2">
                  {[
                    { key: "sans", label: "Sleek Sans-serif (Inter)" },
                    { key: "serif", label: "Elegant Editorial Serif (Playfair)" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTypography(item.key)}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-center transition-colors cursor-pointer text-[10px] font-bold uppercase",
                        typography === item.key
                          ? "border-accent bg-accent/10 text-accent font-bold"
                          : "border-border/30 text-foreground-subtle hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Branding details */}
        <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/10">
            <Shield size={16} className="text-accent" />
            <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
              Corporate Branding Assets
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                Organization Branding Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Unggul Axiom"
                className="h-10 w-full px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                Branding Logo URL
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="e.g. /favicon.png"
                className="h-10 w-full px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                Portal Greeting Title
              </label>
              <input
                type="text"
                value={greetingHeader}
                onChange={(e) => setGreetingHeader(e.target.value)}
                placeholder="e.g. Strategic Portal"
                className="h-10 w-full px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-shimmer h-10 px-6 rounded-lg text-sm font-semibold tracking-wide text-accent-foreground disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Templates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
