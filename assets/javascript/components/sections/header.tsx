
import React from 'react';
import Drawer from "@/components/drawer";
import { Icons } from "@/components/icons";
import Menu from "@/components/menu";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/useTranslation";

export default function Header() {
  const [addBorder, setAddBorder] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setAddBorder(true);
      } else {
        setAddBorder(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={
        "relative sticky top-0 z-50 py-6 bg-background/60 backdrop-blur"
      }
    >
      <div className="flex justify-between items-center container">
        <a
          href="/"
          title="brand-logo"
          className="relative mr-6 flex items-center space-x-2"
        >
          <Icons.logo className="w-auto h-[40px]" />
          <span className="font-bold text-2xl text-primary">{siteConfig.name}</span>
        </a>

        <div className="hidden lg:block">
          <div className="flex items-center ">
            <nav className="mr-10">
              <Menu />
            </nav>
            <div className="flex items-center gap-2">
              <a
                href="/accounts/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-base")}
              >
                {t('login', 'Login')}
              </a>
              <a
                href="/accounts/signup"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "text-white flex gap-2 text-base"
                )}
              >
                {t('get_started_free', 'Get Started for Free')}
              </a>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          <Drawer />
        </div>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[1px] bg-border opacity-0 transition-opacity duration-200",
          addBorder && "opacity-100"
        )}
      />
    </header>
  );
}
