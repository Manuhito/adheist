import * as React from 'react';
import BlogCard from "@/components/blog-card";
import { siteConfig } from "@/lib/config";
import { constructMetadata } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";

export const metadata = constructMetadata({
  title: "Blog",
  description: `Latest news and updates from ${siteConfig.name}.`,
});

// Definir la interfaz para window con nuestra propiedad personalizada
interface CustomWindow extends Window {
  __BLOG_DATA__?: any[];
  __TRANSLATIONS__?: Record<string, string>;
  baseLayoutReady?: boolean;
}

// Asignar el tipo personalizado a window
declare const window: CustomWindow;

export default function Blog() {
  const { t } = useTranslation();
  
  // Acceder a los datos a través de window.__BLOG_DATA__
  const blogData = window.__BLOG_DATA__ || [];
  
  const articles = blogData.sort((a: any, b: any) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <div className="mx-auto w-full max-w-screen-xl px-2.5 lg:px-20 mt-24">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            {t('articles', 'Articles')}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            {t('latest_news', 'Latest news and updates from')} {siteConfig.name}
          </p>
        </div>
      </div>
      <div className="min-h-[50vh] bg-white/50 dark:bg-primary/5 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] dark:shadow-[inset_10px_-50px_94px_0_rgb(0,0,0,0.1)] backdrop-blur-lg border-t border-border/40 dark:border-primary/20">
        <div className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-8 px-2.5 py-10 lg:px-20 lg:grid-cols-3">
          {articles.map((data: any, idx: number) => (
            <BlogCard key={data.slug} data={data} priority={idx <= 1} />
          ))}
        </div>
      </div>
    </>
  );
}
