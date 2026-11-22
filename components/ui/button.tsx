"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "sm";
  loading?: boolean;
};

/** Pill button. While `loading` the label is replaced by three pulsing dots and the width stays locked. */
export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, type = "button", ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number | undefined>();

  useLayoutEffect(() => {
    if (loading && ref.current) setWidth(ref.current.getBoundingClientRect().width);
    if (!loading) setWidth(undefined);
  }, [loading]);

  const cls = [
    "btn",
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-secondary btn-danger" : "btn-secondary",
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={cls}
      style={width ? { width } : undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      <span className="label">{children}</span>
      <span className="dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
