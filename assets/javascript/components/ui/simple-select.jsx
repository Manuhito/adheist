import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from "../../lib/utils";

const SimpleSelect = ({ value, onValueChange, placeholder, children, className, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected label when value changes
  useEffect(() => {
    if (value && children) {
      const childrenArray = React.Children.toArray(children);
      const selectedChild = childrenArray.find(child => 
        child.props && child.props.value === value
      );
      if (selectedChild) {
        setSelectedLabel(selectedChild.props.children);
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, children]);

  const handleSelect = (selectedValue, label) => {
    if (onValueChange) {
      onValueChange(selectedValue);
    }
    setSelectedLabel(label);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={selectRef} {...props}>
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={cn(
          selectedLabel ? "text-foreground" : "text-muted-foreground"
        )}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 opacity-50 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="p-1 max-h-60 overflow-auto">
            {React.Children.toArray(children).map((child, index) => {
              if (React.isValidElement(child) && child.type === SimpleSelectItem) {
                return React.cloneElement(child, {
                  onSelect: handleSelect,
                  isSelected: child.props.value === value
                });
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SimpleSelectItem = ({ value, children, onSelect, isSelected, className, ...props }) => {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      onClick={() => onSelect && onSelect(value, children)}
      {...props}
    >
      {children}
    </div>
  );
};

export { SimpleSelect, SimpleSelectItem };
