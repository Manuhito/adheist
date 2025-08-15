"use client";
import * as React from "react";
import Features from "@/components/features-vertical";
import Section from "@/components/section";
import { Sparkles, Upload, Zap } from "lucide-react";

const data = [
  {
    id: 1,
    title: "Find Winning Ad Ideas",
    content:
      "Discover high-performing ads from competitors and industry leaders with the highest ROI.",
    image: "/static/images/landing/dashboard.png",
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "Create Ads Automatically",
    content: "Turn winning ideas into your own ads with just a few clicks - 100% Money Back Guarantee.",
    image: "/static/images/landing/dashboard.png",
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "Polish and Launch",
    content: "Quickly adjust with AI tools and launch your new high-converting ads.",
    image: "/static/images/landing/dashboard.png",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function Component() {
  return (
    <Section>
    <div className= "text-center space-y-4 pb-6 mx-auto" >
    <h2 className="mx-auto mt-4 max-w-xs text-3xl font-semibold sm:max-w-none sm:text-4xl md:text-5xl" >
      Creating Ads with <span className= "text-primary" > AdHeist </span> is
  Simple
    </h2>
    </div>
    < Features data = { data } />
      </Section>
  );
}
