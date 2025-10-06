import React from "react";
import { createRoot } from "react-dom/client";
import { NotFound, Illustration } from "@/error-pages/404/not-found";

const NotFoundPage = () => {
  return (
    <div className= "relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10" >
    <div className="relative max-w-5xl mx-auto w-full" >
      <Illustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.03] text-foreground" />
        <NotFound
          title="Page not found"
          description = "Lost, this page is. In another system, it may be."
        />
    </div>
    </div>
  );
};

// Mount component
const container = document.getElementById("error-404-root");
if (container) {
  const root = createRoot(container);
  root.render(<NotFoundPage />);
}
