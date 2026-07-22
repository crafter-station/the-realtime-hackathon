import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils";

const labelStyles =
  "font-mono [font-size:var(--type-label-size)] [font-weight:var(--type-label-weight)] [line-height:var(--type-label-leading)] [letter-spacing:var(--type-label-tracking)] uppercase";

const labelVariants = cva(
  labelStyles,
  {
    variants: {
      tone: {
        default: "text-current",
        muted: "text-muted-foreground",
        accent: "text-primary",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

const iconLabelVariants = cva(
  "inline-flex min-w-0 items-center align-middle [&_[data-slot=icon-label-icon]]:pointer-events-none [&_[data-slot=icon-label-icon]]:shrink-0 [&_[data-slot=icon-label-icon]]:text-primary [&_[data-slot=icon-label-text]]:min-w-0",
  {
    variants: {
      appearance: {
        label: labelStyles,
        inherit:
          "[font-family:inherit] [font-size:inherit] [font-weight:inherit] [letter-spacing:inherit] [line-height:inherit] [text-transform:inherit]",
      },
      size: {
        sm: "gap-1.5 [&_[data-slot=icon-label-icon]]:size-3.5",
        default: "gap-2 [&_[data-slot=icon-label-icon]]:size-4",
        lg: "gap-3 [&_[data-slot=icon-label-icon]]:size-5",
        xl: "gap-4 [&_[data-slot=icon-label-icon]]:size-8",
      },
      tone: {
        default: "text-current",
        muted: "text-muted-foreground",
        accent: "text-primary",
      },
      iconTone: {
        accent: "",
        current: "[&_[data-slot=icon-label-icon]]:text-current",
        muted: "[&_[data-slot=icon-label-icon]]:text-muted-foreground",
      },
    },
    defaultVariants: {
      appearance: "label",
      size: "default",
      tone: "default",
      iconTone: "accent",
    },
  },
);

type IconLabelProps<T extends ElementType = "span"> = {
  as?: T;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
} & VariantProps<typeof iconLabelVariants> &
  Omit<ComponentPropsWithoutRef<T>, "as">;

function IconLabel<T extends ElementType = "span">({
  as,
  icon: Icon,
  trailingIcon: TrailingIcon,
  appearance,
  size,
  tone,
  iconTone,
  className,
  children,
  ...props
}: IconLabelProps<T>) {
  const Component = as ?? "span";

  return (
    <Component
      data-slot="icon-label"
      className={cn(
        iconLabelVariants({ appearance, size, tone, iconTone }),
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          data-slot="icon-label-icon"
          data-icon="inline-start"
          aria-hidden="true"
        />
      ) : null}
      <span data-slot="icon-label-text">{children}</span>
      {TrailingIcon ? (
        <TrailingIcon
          data-slot="icon-label-icon"
          data-icon="inline-end"
          aria-hidden="true"
        />
      ) : null}
    </Component>
  );
}

export { IconLabel, iconLabelVariants, labelVariants };
