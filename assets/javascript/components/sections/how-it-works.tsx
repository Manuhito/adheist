"use client";
import * as React from "react";
import Features from "@/components/features-vertical";
import Section from "@/components/section";
import { Sparkles, Upload, Zap } from "lucide-react";

const data = [
  {
    id: 1,
    title: "Find Backlink Opportunities",
    content:
      "Explore 2,000+ pre-vetted backlink sources, organized by category and niche.",
    image: "/static/images/landing/dashboard.png",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "Build Each Link in Minutes",
    content: "Secure each backlink quickly and easily.",
    image: "/static/images/landing/dashboard.png",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "Track Your Progress",
    content: "Stay organized and monitor your link-building efforts as you go.",
    image: "/static/images/landing/dashboard.png",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function Component() {
  return (
    <Section>
    <div className= "text-center space-y-4 pb-6 mx-auto" >
    <h2 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl" >
      Building Links with <span className= "text-primary" > AdHeist </span> is
  Easy
    </h2>
    </div>
    < Features data = { data } />
      </Section>
  );
}
