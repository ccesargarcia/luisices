"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogSize,
} from "./dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "./utils";

interface ResponsiveDialogContextValue {
  isDesktop: boolean;
}

const ResponsiveDialogContext = React.createContext<ResponsiveDialogContextValue>({
  isDesktop: true,
});

export const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext);

export interface ResponsiveDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  shouldScaleBackground?: boolean;
  dismissible?: boolean;
}

/**
 * ResponsiveDialog
 * 
 * Componente unificado adaptativo:
 * - Desktop (>= 768px): Renderiza o Dialog tradicional centralizado (Radix UI)
 * - Mobile (< 768px): Renderiza o Drawer deslizante do fundo (Bottom Sheet via vaul)
 *   com gesto de arrastar para fechar (drag-to-dismiss) e pill handle.
 */
export function ResponsiveDialog({
  children,
  open,
  defaultOpen,
  onOpenChange,
  shouldScaleBackground,
  dismissible = true,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const contextValue = React.useMemo(() => ({ isDesktop }), [isDesktop]);

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      {isDesktop ? (
        <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          shouldScaleBackground={shouldScaleBackground}
          dismissible={dismissible}
        >
          {children}
        </Drawer>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogTrigger {...props}>{children}</DialogTrigger>;
  }
  return <DrawerTrigger {...props}>{children}</DrawerTrigger>;
}

export function ResponsiveDialogClose({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogClose {...props}>{children}</DialogClose>;
  }
  return <DrawerClose {...props}>{children}</DrawerClose>;
}

export interface ResponsiveDialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
  size?: DialogSize;
  noPadding?: boolean;
}

export const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  ResponsiveDialogContentProps
>(({ className, children, size, hideClose, noPadding = false, ...props }, ref) => {
  const { isDesktop } = useResponsiveDialog();

  if (isDesktop) {
    return (
      <DialogContent
        ref={ref}
        size={size}
        hideClose={hideClose}
        noPadding={noPadding}
        className={className}
        {...props}
      >
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent
      ref={ref}
      className={cn(
        "max-h-[90dvh] flex flex-col rounded-t-[1.5rem] p-0 outline-hidden",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2",
        noPadding && "p-0 pb-[env(safe-area-inset-bottom)]"
      )}>
        {children}
      </div>
    </DrawerContent>
  );
});
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogHeader className={className} {...props} />;
  }
  return (
    <DrawerHeader
      className={cn("text-left px-0 pt-1 pb-3 shrink-0", className)}
      {...props}
    />
  );
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogFooter className={className} {...props} />;
  }
  return (
    <DrawerFooter
      className={cn("px-0 pt-3 pb-2 mt-auto shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogTitle className={className} {...props} />;
  }
  return (
    <DrawerTitle
      className={cn("text-lg font-bold text-foreground", className)}
      {...props}
    />
  );
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = useResponsiveDialog();
  if (isDesktop) {
    return <DialogDescription className={className} {...props} />;
  }
  return (
    <DrawerDescription
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
