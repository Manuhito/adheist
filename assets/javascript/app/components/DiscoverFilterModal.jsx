import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { SimpleSelect, SimpleSelectItem } from "../../components/ui/simple-select.jsx";
import { Label } from "../../components/ui/label";

/**
 * Componente de filtros para la página Discover
 * Muestra un icono de embudo que abre un modal con opciones de filtrado
 */
function DiscoverFilterModal({ selectedCompany, onFiltersApply }) {
  const [isOpen, setIsOpen] = useState(false);
  const allPlatformsValue = 'FACEBOOK,INSTAGRAM,AUDIENCE_NETWORK,MESSENGER,THREADS';

  const createDefaultFilters = () => ({
    platform: allPlatformsValue,
    industry: '',
    status: 'active',
    sortBy: ''
  });

  const [filters, setFilters] = useState(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters);
  const [industries, setIndustries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const filtersApplied = !(
    appliedFilters.platform === allPlatformsValue &&
    appliedFilters.industry === '' &&
    (!appliedFilters.status || appliedFilters.status === 'all') &&
    !appliedFilters.sortBy
  );

  // Cargar industrias al montar el componente
  useEffect(() => {
    setIsLoading(true);
    fetch('/ads/industries/')
      .then(response => response.json())
      .then(data => {
        setIndustries(data.industries || []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading industries:', error);
        setIsLoading(false);
      });
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    const filterParams = new URLSearchParams();
    
    // Add selected company if available
    if (selectedCompany && selectedCompany.pageId) {
      filterParams.append('page_id', selectedCompany.pageId);
    }
    
    // Add platform filter
    if (filters.platform) {
      filterParams.append('publisher_platform', filters.platform);
    }
    
    // Add industry filter
    if (filters.industry) {
      filterParams.append('industries', filters.industry);
    }
    
    // Add status filter
    if (filters.status && filters.status !== 'all') {
      filterParams.append('meta_status', filters.status.toUpperCase());
    }
    
    setAppliedFilters({ ...filters });

    // Call parent callback with filters
    if (onFiltersApply) {
      onFiltersApply(filterParams.toString());
    }
    
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="group relative h-9 px-3 ml-2 rounded-lg"
        >
          <Filter className="h-5 w-5" />
          {filtersApplied && (
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-primary transition-colors group-hover:bg-white" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter</DialogTitle>
          <DialogDescription>
            Configure your search filters
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Platform Filter */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <SimpleSelect 
              value={filters.platform} 
              onValueChange={(value) => handleFilterChange('platform', value)}
              placeholder="Select platform"
            >
              <SimpleSelectItem value="FACEBOOK">Facebook</SimpleSelectItem>
              <SimpleSelectItem value="INSTAGRAM">Instagram</SimpleSelectItem>
              <SimpleSelectItem value="AUDIENCE_NETWORK">Audience Network</SimpleSelectItem>
              <SimpleSelectItem value="MESSENGER">Messenger</SimpleSelectItem>
              <SimpleSelectItem value="THREADS">Threads</SimpleSelectItem>
              <SimpleSelectItem value={allPlatformsValue}>All</SimpleSelectItem>
            </SimpleSelect>
          </div>

          {/* Industry Filter */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <SimpleSelect 
              value={filters.industry} 
              onValueChange={(value) => handleFilterChange('industry', value)}
              placeholder="Select industry"
            >
              {isLoading ? (
                <SimpleSelectItem value="" disabled>Loading...</SimpleSelectItem>
              ) : (
                industries.map((industry, index) => (
                  <SimpleSelectItem key={index} value={industry}>
                    {industry}
                  </SimpleSelectItem>
                ))
              )}
            </SimpleSelect>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SimpleSelect 
              value={filters.status} 
              onValueChange={(value) => handleFilterChange('status', value)}
              placeholder="Select status"
            >
              <SimpleSelectItem value="active">Active</SimpleSelectItem>
              <SimpleSelectItem value="inactive">Inactive</SimpleSelectItem>
              <SimpleSelectItem value="all">All</SimpleSelectItem>
            </SimpleSelect>
          </div>

          {/* Sort By Filter */}
          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort by</Label>
            <SimpleSelect 
              value={filters.sortBy} 
              onValueChange={(value) => handleFilterChange('sortBy', value)}
              placeholder="Select sort option"
            >
              <SimpleSelectItem value="newest">Newest</SimpleSelectItem>
              <SimpleSelectItem value="oldest">Oldest</SimpleSelectItem>
              <SimpleSelectItem value="popular">Most Popular</SimpleSelectItem>
            </SimpleSelect>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleApplyFilters} className="px-6">
              Apply filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DiscoverFilterModal;
