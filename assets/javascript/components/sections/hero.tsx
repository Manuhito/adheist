"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { Icons } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/components/common"; // Changed from default to named import

const ease = [0.16, 1, 0.3, 1];

function HeroPill() {
  return (
    <motion.a
      href="/accounts/signup"
      className="flex w-auto items-center space-x-2 rounded-full bg-primary/20 px-2 py-1 ring-1 ring-accent whitespace-pre"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease }}
    >
      <p className="text-xs font-medium text-primary sm:text-sm">
        Create Winning Ads in Minutes
      </p>
      <svg
        width="12"
        height="12"
        className="ml-1"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.78141 5.33312L5.20541 1.75712L6.14808 0.814453L11.3334 5.99979L6.14808 11.1851L5.20541 10.2425L8.78141 6.66645H0.666748V5.33312H8.78141Z"
          fill="hsl(var(--primary))"
        />
      </svg>
    </motion.a>
  );
}

export function HeroTitles() {
  return (
    <div className="flex w-full flex-col space-y-4 overflow-hidden max-w-7xl mx-auto">
      <HeroHighlightDemo />
    </div>
  );
}

export function HeroHighlightDemo() {
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
      <HeroHighlight containerClassName="h-[32rem]">
        <div className="flex flex-col items-center max-w-2xl mx-auto w-full pt-8 md:pt-12">
          <HeroPill />
          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: [20, -5, 0],
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0.0, 0.2, 1],
            }}
            className="text-4xl font-bold tracking-tight sm:text-6xl text-neutral-700 dark:text-white max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto mt-16"
          >
            <Highlight className="text-black dark:text-white">
            #1 Ai Ad Generator 
            </Highlight>{" "}
            <br />
            that Converts
          </motion.h1>

          <motion.div
            className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8 mt-12 max-w-4xl w-full px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease }}
          >
            <div className="flex items-center gap-2">
              <span className="text-primary text-sm">✓</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Save <span className="font-medium">$2K-$10K</span>/month
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-sm">✓</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                <span className="font-medium">Create Ads</span> 24/7
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-sm">✓</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                <span className="font-medium">100%</span> Money Back Guarantee
              </span>
            </div>
          </motion.div>

          <HeroCTA />
        </div>
      </HeroHighlight>
    </div>
  );
}

function HeroCTA() {
  const getCookie = (name: string): string => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };
  return (
    <>
    <motion.div
        className= "mx-auto mt-12 flex w-full max-w-2xl flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
  initial = {{ opacity: 0, y: 20 }
}
animate = {{ opacity: 1, y: 0 }}
transition = {{ delay: 0.8, duration: 0.8, ease }}
      >
  <Link
          href="/accounts/signup"
className = {
  cn(
    buttonVariants({ variant: "default" }),
  "w-full sm:w-auto text-background flex gap-2 bg-primary hover:bg-primary/90 px-8 py-6 text-lg"
          )}
        >
  Start Free Beta
    </Link>
    < form method = "post" action = "/accounts/google/login/" >
      <input type="hidden" name = "csrfmiddlewaretoken" value = { getCookie('csrftoken') } />
        <button
            type="submit"
className = {
  cn(
    buttonVariants({ variant: "outline" }),
  "w-full sm:w-auto flex items-center gap-2 bg-white text-gray-600 hover:text-gray-600 hover:bg-gray-50 border-gray-300 px-8 py-6 text-lg"
            )}
          >
          <Icons.google className="h-5 w-5" />
          Start Free with Google
  </button>
  </form>
  </motion.div>
  < motion.p
        className = "mt-6 text-sm text-muted-foreground"
initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
transition = {{ delay: 1.0, duration: 0.8 }}
      >
  No Credit Card Required
    </motion.p>
    </>
  );
}

export default function Hero2() {
  return (
    <section id="hero">
      <div className="relative flex w-full flex-col items-center justify-start px-4 pt-4 sm:px-6 sm:pt-6 md:pt-6 lg:px-8">
        <HeroTitles />
        <div className="pointer-events-none absolute inset-x-0 -bottom-12 h-1/3 bg-gradient-to-t from-background via-background to-transparent lg:h-1/4"></div>
      </div>
    </section>
  );
}
