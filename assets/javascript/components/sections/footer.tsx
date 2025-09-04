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
    <div className= "max-w-6xl mx-auto py-16 sm:px-10 px-5 pb-0" >
    <a
          href="/"
  title = { siteConfig.name }
  className = "relative mr-6 flex items-center space-x-2"
    >
    <Icons.logo className="w-auto h-[40px]" />
      <span className="font-bold text-xl" > { siteConfig.name } </span>
        </a>

        <div className="grid md:grid-cols-3 sm:grid-cols-2 mt-8 max-w-4xl mx-auto">
        {
          siteConfig.footer.map((section, index) => (
            <div key= { index } className = "mb-5" >
            <h2 className="font-semibold" > { section.title } </h2>
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
  < div className = "max-w-6xl mx-auto border-t py-2 grid md:grid-cols-2 h-full justify-between w-full grid-cols-1 gap-1" >
    <span className="text-sm tracking-tight text-foreground" >
      {t('copyright', 'Copyright ©')} { new Date().getFullYear() } { " " }
<a href="/" className = "cursor-pointer" >
  { siteConfig.name }
  </a>{" "}
  </span>
  < ul className = "flex justify-start md:justify-end text-sm tracking-tight text-foreground" >
    <li className="mr-3 md:mx-4" >
      <a href="#" target = "_blank" rel = "noopener noreferrer" >
        {t('privacy_policy', 'Privacy Policy')}
          </a>
          </li>
          < li className = "mr-3 md:mx-4" >
            <a href="#" target = "_blank" rel = "noopener noreferrer" >
              {t('terms_of_service', 'Terms of Service')}
                </a>
                </li>
                </ul>
                </div>
                </div>
                </footer>
  );
}
