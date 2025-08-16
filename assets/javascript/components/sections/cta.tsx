"use client";

import * as React from "react";
import Section from "@/components/section";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export default function CtaSection() {
  const csrfToken = getCookie('csrftoken');
  return (
    <Section
      id="cta"
      title="Ready to create winning ads?"
      subtitle="Zero Risk, Full Refund - No Questions Asked"
      className="bg-primary/10 rounded-xl py-16"
    >
      <div className="flex flex-col w-full sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
        <a
          href="/accounts/signup"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-background flex gap-2 bg-primary hover:bg-primary/90"
          )}
        >
          Start Free Beta
        </a>
  < form method = "post" action = "/accounts/google/login/" >
    <input type="hidden" name = "csrfmiddlewaretoken" value = { getCookie('csrftoken') } />
      <button
            type="submit"
className = {
  cn(
    buttonVariants({ variant: "outline" }),
  "w-full sm:w-auto flex items-center gap-2 bg-white text-gray-600 hover:text-gray-600 hover:bg-gray-50 border-gray-300"
            )}
          >
          <Icons.google className="h-5 w-5" />
          Start Free with Google
  </button>
  </form>
      </div>
    </Section>
  );
}
