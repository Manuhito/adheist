'use client';

import Author from "@/components/blog-author";
import CtaSection from "@/components/sections/cta";
import { siteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { Image } from "@/components/common/index";
import React, { Suspense } from "react";
import { Calendar, Clock3, BadgeCheck } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

// Definir la interfaz para window con nuestra propiedad personalizada
interface CustomWindow extends Window {
  __TRANSLATIONS__?: Record<string, string>;
  baseLayoutReady?: boolean;
}

// Asignar el tipo personalizado a window
declare const window: CustomWindow;

interface Post {
  metadata: {
    title: string;
    publishedAt: string;
    author: string;
    authorImage?: string;
    description: string;
    image: string;
    tags: string[];
    readTime?: number;
  };
  slug: string;
  source: string;
}

interface BlogPostProps {
  post: Post;
}

export default function BlogPost({ post }: BlogPostProps) {
  const { t } = useTranslation();
  return (
    <section id="blog">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${siteConfig.url}${post.metadata.image}`
              : `${siteConfig.url}/blog/${post.slug}/opengraph-image`,
            url: `${siteConfig.url}/blog/${post.slug}`,
            author: {
              "@type": "Person",
              name: siteConfig.name,
            },
          }),
        }}
      />
      <div className="mx-auto w-full max-w-[800px] px-4 sm:px-6 lg:px-8 space-y-4 my-12">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1">
            <BadgeCheck className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-blue-500 font-medium">Written by a human</span>
          </div>
          <h1 className="title font-medium text-4xl md:text-5xl tracking-tighter">
            {post.metadata.title}
          </h1>
        </div>
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-2">
            <Author
              twitterUsername={post.metadata.author}
              name={post.metadata.author}
              image={post.metadata.authorImage || "/static/images/blog/default-avatar.png"}
            />
          </div>
          
          <Suspense fallback={<p className="h-5" />}>
            <div className="flex flex-col items-start space-y-2">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                <time
                  dateTime={post.metadata.publishedAt}
                  className="text-sm text-gray-500"
                >
                  {new Date(post.metadata.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
              <div className="flex items-center space-x-1">
                <Clock3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-500">
                  {post.metadata.readTime || 1} min read
                </span>
              </div>
            </div>
          </Suspense>
        </div>
        <article
          className="prose dark:prose-invert mx-auto max-w-full text-black dark:text-gray-100 prose-p:text-black dark:prose-p:text-gray-100 prose-li:text-black dark:prose-li:text-gray-100 prose-headings:text-black dark:prose-headings:text-white prose-strong:text-black dark:prose-strong:text-gray-100 prose-a:text-blue-600 dark:prose-a:text-blue-400"
          dangerouslySetInnerHTML={{ __html: post.source }}
        ></article>
      </div>
      <CtaSection />
    </section>
  );
}
