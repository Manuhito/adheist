'use client';

import Author from "@/components/blog-author";
import CtaSection from "@/components/sections/cta";
import { siteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { Image } from "@/components/common/index";
import { Suspense } from "react";

interface Post {
  metadata: {
    title: string;
    publishedAt: string;
    summary: string;
    author: string;
    image?: string;
  };
  slug: string;
  source: string;
}

interface BlogPostProps {
  post: Post;
}

export default function BlogPost({ post }: BlogPostProps) {
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
        <Suspense
          fallback={
            <div className="mb-8 w-full h-64 bg-gray-200 animate-pulse rounded-lg"></div>
          }
        >
          {post.metadata.image && (
            <div className="mb-8">
              <Image
                width={1920}
                height={1080}
                src={post.metadata.image}
                alt={post.metadata.title}
                className="w-full h-auto rounded-lg border shadow-md"
              />
            </div>
          )}
        </Suspense>
        <div className="flex flex-col">
          <h1 className="title font-medium text-3xl tracking-tighter">
            {post.metadata.title}
          </h1>
        </div>
        <div className="flex justify-between items-center text-sm">
          <Suspense fallback={<p className="h-5" />}>
            <div className="flex items-center space-x-2">
              <time
                dateTime={post.metadata.publishedAt}
                className="text-sm text-gray-500"
              >
                {formatDate(post.metadata.publishedAt)}
              </time>
            </div>
          </Suspense>
        </div>
        <div className="flex items-center space-x-2">
          <Author
            twitterUsername={post.metadata.author}
            name={post.metadata.author}
            image={"/static/images/landing/author.jpg"}
          />
        </div>
        <article
          className="prose dark:prose-invert mx-auto max-w-full"
          dangerouslySetInnerHTML={{ __html: post.source }}
        ></article>
      </div>
      <CtaSection />
    </section>
  );
}
