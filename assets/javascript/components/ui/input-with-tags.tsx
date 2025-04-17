"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Tag {
  text: string;
  onRemove: () => void;
}

const Tag = ({ text, onRemove }: Tag) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      transition={{
        duration: 0.4,
        ease: "circInOut",
        type: "spring",
      }}
      className="bg-card text-foreground border border-primary/20 px-2 py-1 rounded-xl text-sm flex items-center gap-1 shadow-sm"
    >
      {text}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 p-0 bg-transparent border-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          style={{ lineHeight: 0 }}
          aria-label="Remove tag"
        >
          <X className="w-3 h-3" />
        </button>
      </motion.div>
    </motion.span>
  );
};

interface InputWithTagsProps {
  placeholder?: string;
  className?: string;
  limit?: number;
}

const InputWithTags = ({
  placeholder,
  className,
  limit = 10,
}: InputWithTagsProps) => {
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!limit || tags.length < limit) {
        setTags([...tags, inputValue.trim()]);
        setInputValue("");
      }
    }
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={cn("flex flex-col gap-2 max-w-xl w-full", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type something and press Enter..."}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full px-4 py-2 bg-card text-foreground border border-primary/20 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none ring-0"
          disabled={limit ? tags.length >= limit : false}
        />
      </motion.div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <Tag key={index} text={tag} onRemove={() => removeTag(index)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { InputWithTags };
