"use client";

import React, { useState, useRef, useEffect } from "react";
import Button from "./button";

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  loading?: boolean;
}

export default function OTPInput({
  length = 6,
  onComplete,
  loading = false
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const [activeInput, setActiveInput] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isOtpValid = otp.every(digit => digit !== "");

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Create a ref callback that doesn't return a value
  const setRef = (index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // Only take the last character if multiple characters are pasted/entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value !== "") {
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setActiveInput(index + 1);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (otp[index] !== "") {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous input
        inputRefs.current[index - 1]?.focus();
        setActiveInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      setActiveInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    if (isNaN(Number(pastedData))) return;

    const newOtp = [...otp];
    for (let i = 0; i < Math.min(pastedData.length, length); i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(digit => digit === "");
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
    setActiveInput(focusIndex);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOtpValid && onComplete) {
      onComplete(otp.join(""));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 justify-center">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={setRef(index)}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(e, index)}
            onKeyDown={e => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-12 h-12 text-center text-xl font-semibold rounded-lg border-2 
              bg-black/30 backdrop-blur-sm text-white
              ${index === activeInput
                ? "border-purple-500"
                : "border-gray-700"
              }
              focus:border-purple-500 focus:outline-none
              transition-colors`}
          />
        ))}
      </div>
      <Button
        type="submit"
        loading={loading}
        disabled={!isOtpValid || loading}
        variant="primary"
        className="w-full"
      >
        Verify OTP
      </Button>
    </form>
  );
}
