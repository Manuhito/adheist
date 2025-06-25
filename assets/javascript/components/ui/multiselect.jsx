import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { X, Loader2 } from "lucide-react";
import { useVirtualizer } from '@tanstack/react-virtual';

import { Badge } from "./badge";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "./command";

export const MultipleSelector = React.forwardRef(
  (
    {
      value = [],
      onChange,
      placeholder,
      options,
      hideClearAllButton = false,
      hidePlaceholderWhenSelected = false,
      emptyIndicator = "No options available",
      commandProps,
      disabled,
      className,
      badgeClassName,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const [onScrollbar, setOnScrollbar] = React.useState(false);

    // Handle click outside to close dropdown
    const handleClickOutside = React.useCallback((event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setOpen(false);
        inputRef.current.blur();
      }
    }, []);

    React.useEffect(() => {
      if (open) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchend", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchend", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchend", handleClickOutside);
      };
    }, [open, handleClickOutside]);

    const handleUnselect = React.useCallback(
      (option) => {
        onChange(value.filter((item) => item.value !== option.value));
      },
      [onChange, value]
    );

    const handleKeyDown = React.useCallback(
      (e) => {
        const input = inputRef.current;
        if (input) {
          if (e.key === "Delete" || e.key === "Backspace") {
            if (input.value === "" && value.length > 0) {
              handleUnselect(value[value.length - 1]);
            }
          }
          if (e.key === "Escape") {
            input.blur();
          }
        }
      },
      [value, handleUnselect]
    );

    // Estado para controlar la carga perezosa
    const [isSearching, setIsSearching] = React.useState(false);
    const [debouncedInputValue, setDebouncedInputValue] = React.useState("");
    
    // Aplicar debounce al input para evitar filtrados excesivos
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedInputValue(inputValue);
        setIsSearching(false);
      }, 300);
      
      if (inputValue !== debouncedInputValue) {
        setIsSearching(true);
      }
      
      return () => clearTimeout(timer);
    }, [inputValue]);
    
    // Mostrar todas las opciones disponibles
    const INITIAL_OPTIONS_LIMIT = 1000; // Un número suficientemente grande para mostrar todas las opciones
    
    // Filter out options that are already selected
    const selectables = React.useMemo(() => {
      // Performance optimization: only filter out selected items
      return options.filter(
        (option) => !value.some((item) => item.value === option.value)
      );
    }, [options, value]);

    // Filter options based on input value with optimized search
    const displayOptions = React.useMemo(() => {
      // Si no hay input, mostrar todas las opciones
      if (!debouncedInputValue) {
        return selectables;
      }
      
      // Optimizar la búsqueda para grandes conjuntos de datos
      const searchLower = debouncedInputValue.toLowerCase();
      return selectables.filter(option => 
        option.label.toLowerCase().includes(searchLower)
      );
    }, [selectables, debouncedInputValue]);
    
    // Referencia para la virtualización
    const parentRef = React.useRef(null);
    
    // Configurar el virtualizador para renderizar solo los elementos visibles
    const rowVirtualizer = useVirtualizer({
      count: displayOptions.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 36, // altura aproximada de cada elemento en px
      overscan: 10, // número de elementos a pre-renderizar fuera de la vista (aumentado)
      initialOffset: 0,
      scrollToFn: (offset, { behavior }) => {
        if (parentRef.current) {
          parentRef.current.scrollTop = offset;
        }
      }
    });

    return (
      <Command
        ref={dropdownRef}
        onKeyDown={(e) => {
          handleKeyDown(e);
          commandProps?.onKeyDown?.(e);
        }}
        className="overflow-visible bg-transparent"
        shouldFilter={false} // We handle filtering ourselves
        {...commandProps}
      >
        <div
          className={`group relative min-h-[38px] rounded-md border border-input text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${value.length > 0 ? 'p-1' : 'px-3 py-2'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} ${className || ''}`}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setOpen(true);
            }
            inputRef?.current?.focus();
          }}
        >
          <div className="flex flex-wrap gap-1" style={{ maxHeight: value.length > 10 ? '100px' : 'auto', overflowY: value.length > 10 ? 'auto' : 'visible' }}>
            {value.map((option) => {
              return (
                <div
                  key={option.value}
                  className={`relative inline-flex h-7 items-center rounded-md border bg-background pl-2 pr-7 text-xs font-medium text-foreground dark:text-secondary-foreground transition-all hover:bg-background ${badgeClassName || ''}`}
                  data-disabled={disabled || undefined}
                >
                  {option.label}
                  <button
                    type="button"
                    className="absolute -inset-y-px -end-px flex size-7 items-center justify-center rounded-e-md border-0 text-muted-foreground/80 outline-none transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(option);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(option)}
                    disabled={disabled}
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              disabled={disabled}
              onValueChange={setInputValue}
              onBlur={() => {
                if (!onScrollbar) {
                  setOpen(false);
                }
              }}
              onFocus={() => setOpen(true)}
              placeholder={
                hidePlaceholderWhenSelected && value.length !== 0
                  ? ""
                  : placeholder
              }
              className={`flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed ${value.length === 0 ? '' : 'ml-1'}`}
              {...props}
            />
          </div>
          {!hideClearAllButton && value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              className="absolute end-0 top-0 flex size-9 items-center justify-center rounded-md text-muted-foreground/80 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Clear all"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Clear</span>
            </button>
          )}
        </div>
        <div className="relative">
          {open && (
            <div 
              className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in"
              data-state="open"
              onMouseLeave={() => setOpen(false)} // Close dropdown when mouse leaves the panel
            >
              <CommandList
                ref={parentRef}
                className="bg-popover text-popover-foreground shadow-md outline-none max-h-[200px] overflow-y-auto"
                onMouseLeave={() => setOnScrollbar(false)}
                onMouseEnter={() => setOnScrollbar(true)}
                onMouseUp={() => inputRef?.current?.focus()}
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.3) transparent' }}
                onScroll={() => {
                  // Forzar actualización del virtualizador cuando se hace scroll
                  if (parentRef.current) {
                    rowVirtualizer.measure();
                  }
                }}
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Buscando...</span>
                  </div>
                ) : displayOptions.length > 0 ? (
                  <CommandGroup className="overflow-auto relative">
                    {/* Eliminar el mensaje de número de opciones */}
                    
                    {/* Lista virtualizada para mejor rendimiento */}
                    <div className="w-full">
                      <div 
                        style={{
                          height: `${rowVirtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                          const option = displayOptions[virtualRow.index];
                          return (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // This is important
                              }}
                              onSelect={() => {
                                // Add the currently highlighted option to the selection
                                onChange([...value, option]);
                                setInputValue(""); // Clear input after selection
                                setOpen(false); // Close dropdown after selection
                              }}
                              disabled={option.disable || disabled}
                              className={`cursor-pointer absolute top-0 left-0 w-full ${option.disable ? "cursor-not-allowed opacity-50" : ""}`}
                              style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`
                              }}
                            >
                              {option.label}
                            </CommandItem>
                          );
                        })}
                      </div>
                    </div>
                  </CommandGroup>
                ) : (
                  <CommandEmpty className="py-6 text-center text-sm">
                    {emptyIndicator}
                  </CommandEmpty>
                )}
              </CommandList>
            </div>
          )}
        </div>
      </Command>
    );
  }
);

MultipleSelector.displayName = "MultipleSelector";

export default MultipleSelector;

export const Option = {
  value: "",
  label: "",
  disable: false,
};
