"use client";

import React from 'react';
import { siteConfig } from "@/lib/config";
import { Check } from "lucide-react";
import Link from "@/components/common";

const PlanIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M13 3L4 14H12L11 21L20 10H12L13 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Pricing: React.FC = () => {
  return (
    <section className="py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-start gap-4 mb-12">
          <h4 className="text-primary font-medium">Pricing</h4>
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground">
            We believe Untitled should be accessible to all companies, no matter
            the size.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {siteConfig.pricing.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col p-8 bg-background rounded-2xl border shadow-sm"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <PlanIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-primary">
                    {plan.name}
                  </h3>
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="text-5xl font-bold">{plan.price}</div>
                  <div className="text-base text-muted-foreground">
                    {plan.period}
                  </div>
                </div>
                <ul className="flex flex-col gap-4 mt-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href={plan.href}
                  className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground text-center font-medium hover:bg-primary/90 transition-colors inline-block"
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
