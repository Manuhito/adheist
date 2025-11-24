"use client";

import * as React from "react";
import { Icons } from "./icons";
import { buttonVariants } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTrigger,
} from "./ui/drawer";
import { cn } from "../lib/utils";
import { IoMenuSharp } from "react-icons/io5";
import { siteConfig } from "../lib/config";

export default function DrawerDemo() {
  return (
    <Drawer>
    <DrawerTrigger>
    <IoMenuSharp className= "text-2xl" />
    </DrawerTrigger>
    < DrawerContent >
    <DrawerHeader>
    <div className="flex items-center space-x-2" >
      <Icons.logo className="w-auto h-[40px]" />
        <span className="font-bold text-xl" > { siteConfig.name } </span>
          </div>
          </DrawerHeader>

          < nav >
          <ul className="space-y-3" >
            {
              siteConfig.header.map((item, index) => (
                <li key= { index } >
                {
                  item.trigger ? (
                    <span className= "font-semibold text-lg" > { item.trigger } </span>
                ) : (
                      <a 
                    href={ item.href || "" } 
                    className = "font-semibold text-lg block py-2 hover:text-primary transition-colors"
                      >
                      { item.label }
                      </a>
                    )
}
</li>
            ))}
</ul>
  </nav>

  < DrawerFooter >
  <a
            href="/accounts/login"
className = { buttonVariants({ variant: "outline" }) }
  >
  Login
  </a>
  < a
href = "/accounts/signup"
className = {
  cn(
    buttonVariants({ variant: "default" }),
  "w-full text-background"
            )}
          >
  Get Started for Free
    </a>
    </DrawerFooter>
    </DrawerContent>
    </Drawer>
  );
}
