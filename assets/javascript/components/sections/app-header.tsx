import React, { useEffect, useState } from 'react';
import Drawer from "@/components/drawer";
import { Icons } from "@/components/icons";
import Menu from "@/components/menu";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function AppHeader() {
  const [addBorder, setAddBorder] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user data from window object if available
    const userData = (window as any).__USER_DATA__;
    if (userData) {
      const initials = userData.name
        ? userData.name.split(' ').map((n) => n[0]).join('').toUpperCase()
        : userData.email[0].toUpperCase();
      
      setUser({
        name: userData.name || '',
        email: userData.email || '',
        initials,
        avatar: userData.avatar || ''
      });
    }
    
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
      className="relative sticky top-0 z-50 py-2 bg-background/60 backdrop-blur"
    >
      <div className="flex justify-between items-center container">
        <a
          href="/"
          title="brand-logo"
          className="relative mr-6 flex items-center space-x-2"
        >
          <Icons.logo className="w-auto h-[40px]" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </a>

        <div className="hidden lg:block">
          <div className="flex items-center">
            <nav className="mr-10">
              <Menu />
            </nav>
            <div className="flex items-center gap-2">
              <a
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "text-primary"
                )}
              >
                Upgrade
              </a>
              
              {user ? (
                <div className="relative">
                  <button 
                    type="button"
                    className="relative flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background text-sm font-medium"
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onMouseEnter={() => {
                      const dropdown = document.getElementById('user-dropdown');
                      if (dropdown) {
                        dropdown.classList.remove('hidden');
                      }
                    }}
                    onMouseLeave={(e: React.MouseEvent) => {
                      // Verificar si el ratón se mueve hacia el menú
                      const dropdown = document.getElementById('user-dropdown');
                      if (dropdown) {
                        const rect = dropdown.getBoundingClientRect();
                        if (
                          e.clientX >= rect.left &&
                          e.clientX <= rect.right &&
                          e.clientY >= rect.top &&
                          e.clientY <= rect.bottom
                        ) {
                          return; // No ocultar si se mueve hacia el menú
                        }
                        
                        // Añadir un pequeño retraso para permitir moverse al menú
                        setTimeout(() => {
                          if (!dropdown.matches(':hover')) {
                            dropdown.classList.add('hidden');
                          }
                        }, 100);
                      }
                    }}
                  >
                    {user.avatar ? (
                      <img
                        className="h-full w-full rounded-full object-cover"
                        src={user.avatar}
                        alt={user.name}
                      />
                    ) : (
                      <span>{user.initials}</span>
                    )}
                  </button>
                  
                  <div 
                    id="user-dropdown"
                    className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/80 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none hidden"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex={-1}
                    onMouseEnter={() => {
                      const dropdown = document.getElementById('user-dropdown');
                      if (dropdown) {
                        dropdown.classList.remove('hidden');
                      }
                    }}
                    onMouseLeave={() => {
                      const dropdown = document.getElementById('user-dropdown');
                      if (dropdown) {
                        dropdown.classList.add('hidden');
                      }
                    }}
                  >
                    <div className="py-1 px-4 border-b dark:border-gray-700">
                      <p className="text-sm font-medium dark:text-gray-100">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{user.email}</p>
                    </div>
                    <div className="py-1" role="none">
                      <a href="/users/profile/" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem">Profile</a>
                      <a href="/ads/billing" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem">Billing</a>
                      <a href="/accounts/logout" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" role="menuitem">Log out</a>
                    </div>
                  </div>
                </div>
              ) : (
                <a
                  href="/accounts/login"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                >
                  Login
                </a>
              )}
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
