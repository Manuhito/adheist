import React from "react";
import { Icons } from "@/components/icons";
import { FaTwitter } from "react-icons/fa";
import { FaFacebook } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

export const BLUR_FADE_DELAY = 0.15;

// Definir APP_URL para evitar errores de TypeScript
declare const APP_URL: string | undefined;
const DEFAULT_URL = "http://localhost:8000";

export const siteConfig = {
  name: "AdHeist",
  description: "Automate your workflow with AI",
  url: APP_URL || "http://localhost:8000",
  keywords: ["SaaS", "Template", "Next.js", "React", "Tailwind CSS"],
  links: {
    email: "support@acme.ai",
    twitter: "https://twitter.com/magicuidesign",
    discord: "https://discord.gg/87p2vpsat5",
    github: "https://github.com/magicuidesign/magicui",
    instagram: "https://instagram.com/magicuidesign/",
  },
  header: [
    /* Features button - temporarily disabled
    {
      trigger: "Features",
      content: {
        main: {
          icon: <Icons.logo className="h-6 w-6" />,
          title: "AI-Powered Automation",
          description: "Streamline your workflow with intelligent automation.",
          href: "#",
        },
        items: [
          {
            href: "#",
            title: "Task Automation",
            description: "Automate repetitive tasks and save time.",
          },
          {
            href: "#",
            title: "Workflow Optimization",
            description: "Optimize your processes with AI-driven insights.",
          },
          {
            href: "#",
            title: "Intelligent Scheduling",
            description: "AI-powered scheduling for maximum efficiency.",
          },
        ],
      },
    },
    */
    /* Solutions button - temporarily disabled
    {
      trigger: "Solutions",
      content: {
        items: [
          {
            title: "For Small Businesses",
            href: "#",
            description: "Tailored automation solutions for growing companies.",
          },
          {
            title: "Enterprise",
            href: "#",
            description: "Scalable AI automation for large organizations.",
          },
          {
            title: "Developers",
            href: "#",
            description: "API access and integration tools for developers.",
          },
          {
            title: "Healthcare",
            href: "#",
            description: "Specialized automation for healthcare workflows.",
          },
          {
            title: "Finance",
            href: "#",
            description: "AI-driven process automation for financial services.",
          },
          {
            title: "Education",
            href: "#",
            description:
              "Streamline administrative tasks in educational institutions.",
          },
        ],
      },
    },
    */
    {
      href: "/blog",
      label: "Blog",
    },
    {
      href: "/pricing",
      label: "Pricing",
    },
  ],
  pricing: [
    {
      name: "Basic plan",
      href: "#",
      price: "49",
      period: "One-Time Payment",
      features: [
        "Access to all basic features",
        "Basic reporting and analytics",
        "Up to 10 individual users",
        "20 GB individual data each user",
        "Basic chat and email support",
      ],
      buttonText: "Get started",
      isPopular: false,
    },
    {
      name: "Business plan",
      href: "#",
      price: "89",
      period: "One-Time Payment",
      features: [
        "200+ integrations",
        "Advanced reporting and analytics",
        "Up to 20 individual users",
        "40 GB individual data each user",
        "Priority chat and email support",
      ],
      buttonText: "Get started",
      isPopular: false,
    },
    {
      name: "Enterprise plan",
      href: "#",
      price: "399",
      period: "One-Time Payment",
      features: [
        "Advanced custom fields",
        "Audit log and data history",
        "Unlimited individual users",
        "Unlimited individual data",
        "Personalized + priority service",
      ],
      buttonText: "Get started",
      isPopular: false,
    },
  ],
  faqs: [
    {
      question: "What is acme.ai?",
      answer: (
        <span>
          acme.ai is a platform that helps you build and manage your AI-powered
          applications. It provides tools and services to streamline the
          development and deployment of AI solutions.
        </span>
      ),
    },
    {
      question: "How can I get started with acme.ai?",
      answer: (
        <span>
          You can get started with acme.ai by signing up for an account on our
          website, creating a new project, and following our quick-start guide.
          We also offer tutorials and documentation to help you along the way.
        </span>
      ),
    },
    {
      question: "What types of AI models does acme.ai support?",
      answer: (
        <span>
          acme.ai supports a wide range of AI models, including but not limited
          to natural language processing, computer vision, and predictive
          analytics. We continuously update our platform to support the latest
          AI technologies.
        </span>
      ),
    },
    {
      question: "Is acme.ai suitable for beginners in AI development?",
      answer: (
        <span>
          Yes, acme.ai is designed to be user-friendly for both beginners and
          experienced developers. We offer intuitive interfaces, pre-built
          templates, and extensive learning resources to help users of all skill
          levels create AI-powered applications.
        </span>
      ),
    },
    {
      question: "What kind of support does acme.ai provide?",
      answer: (
        <span>
          acme.ai provides comprehensive support including documentation, video
          tutorials, a community forum, and dedicated customer support. We also
          offer premium support plans for enterprises with more complex needs.
        </span>
      ),
    },
  ],
  footer: [
    {
      title: "Company",
      links: [
        { href: "/pricing", text: "Pricing", icon: null }
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/blog", text: "Blog", icon: null },
        { href: "mailto:hey@adheist.ai", text: "Support", icon: null },
      ],
    },
    {
      title: "Social",
      links: [
        {
          href: "https://www.facebook.com/people/AdHeist/61579908885918/",
          text: "Facebook",
          icon: <FaFacebook />,
        },
        {
          href: "https://x.com/AdHeist_saas",
          text: "X",
          icon: <FaTwitter />,
        },
        {
          href: "https://www.instagram.com/adheist_saas/",
          text: "Instagram",
          icon: <RiInstagramFill />,
        },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
