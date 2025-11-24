import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const StepOne = ({ onNext, initialData, user, setMascotMessageOverride }) => {
  const [url, setUrl] = useState(initialData?.url || '');

  useEffect(() => {
    // If user logged in via Google and we don't have a URL yet
    if (user?.isGoogleLogin && !url && !initialData?.url) {
      // Try to prefill from Google Hosted Domain (hd) first
      if (user.googleHd) {
        setUrl(`https://${user.googleHd}`);
        return;
      }

      // Fallback to email domain extraction
      if (user.email) {
        try {
          const emailDomain = user.email.split('@')[1];
          const genericDomains = ['gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'];

          if (emailDomain && !genericDomains.includes(emailDomain.toLowerCase())) {
            setUrl(`https://${emailDomain}`);
          }
        } catch (e) {
          console.error("Error prefilling domain:", e);
        }
      }
    }
  }, [user, initialData]);

  const validateUrl = (string) => {
    if (!string) return false;
    try {
      // Prepend https:// if missing to check validity of domain-only inputs
      const urlToTest = /^https?:\/\//i.test(string) ? string : `https://${string}`;
      const urlObj = new URL(urlToTest);
      const hostname = urlObj.hostname;

      // Split by dot to check structure
      const parts = hostname.split('.');

      // Must have at least domain and TLD (e.g. example.com) -> length >= 2
      if (parts.length < 2) return false;

      // Validate TLD (last part)
      const tld = parts[parts.length - 1];
      // TLDs must be at least 2 chars and usually letters (e.g. .com, .ai, .io)
      if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

      // Check for empty parts (e.g. "example..com") or parts starting/ending with hyphen
      // (URL constructor handles some of this, but being explicit helps)
      const isValidPart = (part) =>
        part.length > 0 &&
        !part.startsWith('-') &&
        !part.endsWith('-') &&
        /^[a-zA-Z0-9-]+$/.test(part);

      // Check all parts except the last one (TLD checked above)
      const domainParts = parts.slice(0, -1);
      return domainParts.every(isValidPart);
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateUrl(url)) {
      onNext({ url });
    }
  };

  const isUrlValid = validateUrl(url);

  useEffect(() => {
    if (setMascotMessageOverride) {
      if (isUrlValid) {
        setMascotMessageOverride("Is this your website?");
      } else {
        setMascotMessageOverride(null);
      }
    }
  }, [isUrlValid, setMascotMessageOverride]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4">
      {/* Matching login form container width */}
      <Card className="w-96 border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              {/* Label matching render_text_input style */}
              <Label htmlFor="website-url" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Your brand website URL
              </Label>
              {/* Input matching render_text_input style */}
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 sm:text-sm h-auto"
                autoFocus
                required
              />
            </div>

            <div className="flex justify-end">
              {/* Button matching login.html style */}
              <Button
                type="submit"
                className="group relative flex justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary h-auto min-w-[100px]"
                disabled={!isUrlValid}
              >
                Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepOne;
