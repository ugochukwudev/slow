"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  loading?: boolean;
}

export default function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  // Base button styles
  const baseStyles = "font-medium rounded-md transition-colors focus:outline-none inline-flex items-center justify-center";

  // Variant styles
  const variantStyles = {
    default: "bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800",
    primary: "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white disabled:from-purple-700 disabled:to-blue-700",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100",
    ghost: "bg-transparent hover:bg-white/10 text-white disabled:text-gray-500",
    link: "bg-transparent text-blue-500 hover:underline disabled:text-blue-300"
  };

  // Size styles
  const sizeStyles = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const buttonStyles = clsx(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    loading && "cursor-not-allowed opacity-70",
    className
  );

  return (
    <button
      className={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
