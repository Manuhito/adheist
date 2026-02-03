import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
const DiscoverFilterModal = forwardRef(({ onFiltersApply, onFiltersChange, selectedCompany }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const allPlatformsValue = 'FACEBOOK,INSTAGRAM,AUDIENCE_NETWORK,MESSENGER,THREADS';

  const createDefaultFilters = () => ({
    platform: allPlatformsValue,
    industry: 'all',
    status: 'active',
    sortBy: 'score_desc'
  });

  const createClearFilters = () => ({
    platform: allPlatformsValue,
    industry: 'all',
    status: 'all',
    sortBy: ''
  });

  const [filters, setFilters] = useState(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters);
  const [industries, setIndustries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const filtersApplied = !(
    (appliedFilters.platform === allPlatformsValue || !appliedFilters.platform) &&
    (appliedFilters.industry === '' || appliedFilters.industry === 'all') &&
    (!appliedFilters.status || appliedFilters.status === 'all') &&
    !appliedFilters.sortBy
  );

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const clearedFilters = createClearFilters();
      setFilters(clearedFilters);
      setAppliedFilters(clearedFilters);

      // Apply cleared filters immediately - don't send any filter params
      if (onFiltersApply) {
        onFiltersApply('');
      }
    },
    applyFiltersWithCompany: () => {
      // Apply current filters with the selectedCompany
      applyCurrentFilters();
    }
  }));

  // Notify parent when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filtersApplied);
    }
  }, [filtersApplied, onFiltersChange]);

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

  // Helper function to build and apply filters
  const applyCurrentFilters = () => {
    const filterParams = new URLSearchParams();

    // Add selected company if available
    if (selectedCompany && selectedCompany.pageId) {
      filterParams.append('page_id', selectedCompany.pageId);
    }

    // Add platform filter - only if not "All"
    if (filters.platform && filters.platform !== allPlatformsValue) {
      filterParams.append('publisher_platform', filters.platform);
    }

    // Add industry filter
    if (filters.industry && filters.industry !== 'all') {
      filterParams.append('industries', filters.industry);
    }

    // Add status filter - only if not "all"
    if (filters.status && filters.status !== 'all') {
      filterParams.append('meta_status', filters.status.toUpperCase());
    }

    // Add sort option
    if (filters.sortBy) {
      filterParams.append('sort_by', filters.sortBy);
    }

    setAppliedFilters({ ...filters });

    // Call parent callback with filters
    if (onFiltersApply) {
      onFiltersApply(filterParams.toString());
    }
  };

  const handleApplyFilters = () => {
    applyCurrentFilters();
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
              <SimpleSelectItem value={allPlatformsValue}>All</SimpleSelectItem>
              <SimpleSelectItem value="FACEBOOK">Facebook</SimpleSelectItem>
              <SimpleSelectItem value="INSTAGRAM">Instagram</SimpleSelectItem>
              <SimpleSelectItem value="AUDIENCE_NETWORK">Audience Network</SimpleSelectItem>
              <SimpleSelectItem value="MESSENGER">Messenger</SimpleSelectItem>
              <SimpleSelectItem value="THREADS">Threads</SimpleSelectItem>
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
              <SimpleSelectItem value="all">All</SimpleSelectItem>
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
              <SimpleSelectItem value="score_desc">Score: High to Low</SimpleSelectItem>
              <SimpleSelectItem value="score_asc">Score: Low to High</SimpleSelectItem>
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
});

DiscoverFilterModal.displayName = 'DiscoverFilterModal';

export default DiscoverFilterModal;
