"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // Mapear temas personalizados (deep-ocean, forest-glow, sunset-amber, etc.) para 'dark' no Sonner
  const effectiveTheme: ToasterProps["theme"] =
    theme === "light"
      ? "light"
      : theme === "system"
      ? "system"
      : "dark";

  return (
    <Sonner
      theme={effectiveTheme}
      className="toaster group z-toast"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans shadow-xl border !opacity-100 backdrop-blur-none",
          description: "text-xs opacity-90",
          actionButton:
            "bg-primary text-primary-foreground font-semibold px-3 py-1 rounded-md text-xs",
          cancelButton:
            "bg-muted text-muted-foreground font-medium px-3 py-1 rounded-md text-xs",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          zIndex: "var(--z-toast)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
