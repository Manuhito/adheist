import Section from "@/components/section";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function CtaSection() {
  return (
    <Section
      id="cta"
      title="Ready to get started?"
      subtitle="5 Free Links - No Credit Card Required"
      className="bg-primary/10 rounded-xl py-16"
    >
      <div className="flex flex-col w-full sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
        <a
          href="/accounts/signup"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-background flex gap-2 bg-primary hover:bg-primary/90"
          )}
        >
          Start with 5 Free Links
        </a>
        <a
          href="/accounts/signup"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full sm:w-auto flex gap-2 bg-white text-gray-600 hover:text-gray-600 hover:bg-gray-50 border-gray-300"
          )}
        >
          Start Free with Google
        </a>
      </div>
    </Section>
  );
}
