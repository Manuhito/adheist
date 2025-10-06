import React from "react";
import { createRoot } from "react-dom/client";
import { ServerError, Illustration } from "@/error-pages/500/server-error";

const ErrorPage = () => {
  return (
    <div className= "relative flex flex-col w-full justify-center min-h-svh bg-background p-6 md:p-10" >
    <div className="relative max-w-5xl mx-auto w-full" >
      <Illustration className="absolute inset-0 w-full h-[50vh] opacity-[0.04] dark:opacity-[0.03] text-foreground" />
        <ServerError
          title="Server error"
          description="Something went wrong on our server. We're working to fix the issue."
        />
    </div>
    </div>
  );
};

// Mount component
const container = document.getElementById("error-500-root");
if (container) {
  const root = createRoot(container);
  root.render(<ErrorPage />);
}
