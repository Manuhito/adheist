"use client";

import * as React from "react";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/lib/config";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer>
    <div className= "container mx-auto py-16 px-6" >
    <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-8" >
      {/* First column: Logo, subtitle, and copyright */ }
      < div className = "flex flex-col justify-between" >
        <div>
        <a
                href="/"
  title = { siteConfig.name }
  className = "flex items-center space-x-2 mb-4"
    >
    <Icons.logo className="w-auto h-[40px]" />
      <span className="font-bold text-xl" > { siteConfig.name } </span>
        </a>
        < p className = "text-sm text-muted-foreground/70 mt-4" >
          AI - powered ad generation that steals the spotlight from your competition.
              </p>
            </div>
            < div className = "mt-16 mb-6" >
              <span className="text-sm tracking-tight text-foreground" >
                © { new Date().getFullYear() } Ad Heist, Inc.All rights reserved.
              </span>
    </div>
    </div>

  {/* Other columns: Product, Company, Legal */ }
  {
    siteConfig.footer.map((section, index) => (
      <div key= { index } className = "mb-5" >
      <h2 className="font-semibold mb-4" > { section.title } </h2>
      <ul>
                {
        section.links.map((link, linkIndex) => (
          <li key= { linkIndex } className = "my-2" >
          <a
                      href={ link.href }
                      className = "group inline-flex cursor-pointer items-center justify-start gap-1 text-muted-foreground duration-200 hover:text-foreground hover:opacity-90"
          >
          { link.icon && link.icon }
                      { link.text }
          < ChevronRight className = "h-4 w-4 translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
          </a>
          </li>
        ))
  }
  </ul>
    </div>
          ))
}
</div>
  </div>
  </footer>
  );
}
