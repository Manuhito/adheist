
"use client";

import * as React from "react";
import BlurFade from "@/components/magicui/blur-fade";
import Section from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Shield, Zap } from "lucide-react";

const problems = [
  {
    title: "Agencies Are Expensive",
    description: "Hiring agencies or freelancers costs $2K-$30K per month for ad creation.",
    icon: DollarSign,
  },
  {
    title: "Most Ads Don't Convert",
    description:
      "Creating ads without real data leads to wasted budget and poor results.",
    icon: Shield,
  },
  {
    title: "Too Many Scattered Tools",
    description:
      "Planning, writing, designing, and launching ads typically requires multiple disjointed tools.",
    icon: Zap,
  },
];

export default function Component() {
  return (
    <Section title="Problem" subtitle="Building Good Links is Hard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {problems.map((problem, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-background border-none shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}
