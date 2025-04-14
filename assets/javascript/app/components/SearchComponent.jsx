import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Search } from 'lucide-react';

/**
 * Search component with popover functionality
 * Uses ShadCN UI components for a clean, accessible interface
 */
export const SearchComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Aquí se implementaría la lógica de búsqueda real
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-md">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-left font-normal"
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Buscar...</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <form onSubmit={handleSearch} className="flex items-center p-2">
            <Input
              placeholder="¿Qué estás buscando?"
              className="border-0 focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button type="submit" size="sm" className="ml-2">
              Buscar
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
};
