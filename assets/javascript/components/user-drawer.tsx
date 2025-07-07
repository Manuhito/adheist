"use client";

import * as React from "react";
import { ThemeSwitch } from "./theme-switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTrigger,
} from "./ui/drawer";
import { IoPersonCircleOutline } from "react-icons/io5";
import { useTranslation } from "../lib/useTranslation";
import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";

export default function UserDrawer() {
  const { t } = useTranslation();

  return (
    <Drawer>
      <DrawerTrigger>
        <IoPersonCircleOutline className="text-2xl" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="px-6">
          <nav>
            <ul className="mt-7 text-left">
              <li className="my-3">
                <a 
                  href="/ads/billing" 
                  className="font-semibold"
                >
                  {t('app_header.billing', 'Billing')}
                </a>
              </li>
              <li className="my-3 flex items-center justify-between">
                <span className="font-semibold">{t('app_header.theme', 'Theme')}</span>
                <ThemeSwitch />
              </li>
            </ul>
          </nav>
        </DrawerHeader>
        <DrawerFooter>
          <a
            href="/accounts/logout"
            className={buttonVariants({ variant: "outline" })}
          >
            {t('app_header.logout', 'Log out')}
          </a>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
