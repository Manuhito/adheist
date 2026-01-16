import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Search, Check, ChevronDown, Building, Factory, Plus } from 'lucide-react';
import { useTranslation } from '../../lib/useTranslation';

/**
 * Search component with popover functionality
 * Uses ShadCN UI components for a clean, accessible interface
 * Similar to the Command pattern from ShadCN
 * @param {Object} props - Component props
 * @param {string|null} props.selectedCompany - Currently selected company
 * @param {Function} props.onCompanyChange - Callback when company selection changes
 */
export const SearchComponent = ({ selectedCompany, onCompanyChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar la lista de empresas al montar el componente
  useEffect(() => {
    setIsLoading(true);

    fetch('/ads/companies/')
      .then(response => response.json())
      .then(data => {
        const companyList = data.companies || [];
        setCompanies(companyList);
        setFilteredCompanies(companyList);
        console.log('Empresas cargadas:', companyList.length);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error al cargar empresas:', error);
        setIsLoading(false);
      });
  }, []);

  // Filtrar empresas basado en la búsqueda
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = companies.filter(company =>
        company.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchQuery, companies]);

  const handleSelectCompany = (company) => {
    setSearchQuery('');
    setIsOpen(false);
    // If clicking on the already selected company, deselect it
    if (selectedCompany === company) {
      onCompanyChange(null);
    } else {
      // Otherwise select the new company
      onCompanyChange(company);
    }
  };

  const handleRequestNewAdvertiser = () => {
    setIsOpen(false);
    window.location.href = '/ads/request-brand/';
  };

  return (
    <div className="w-full max-w-md space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between bg-background px-3 font-normal min-h-[38px] h-[38px]"
          >
            <span className={!selectedCompany ? "text-muted-foreground flex items-center" : ""}>
              {selectedCompany || (
                <>
                  <Building className="h-4 w-4 mr-2" />
                  {t('search.company', 'Company')}
                </>
              )}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder={t('search.search_company', 'Search company...')}
                className="flex h-8 w-full rounded-md border-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              {isLoading ? (
                <div className="py-6 text-center text-sm">
                  {t('search.loading_companies', 'Loading companies...')}
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="py-2">
                  <div className="px-2 py-1.5 text-center text-sm text-muted-foreground mb-2">
                    {t('search.no_companies', 'No companies found.')}
                  </div>
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={handleRequestNewAdvertiser}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>{t('search.request_new_advertiser', 'Request a new advertiser')}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  {filteredCompanies.map((company, index) => (
                    <div
                      key={index}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      onClick={() => handleSelectCompany(company)}
                    >
                      <span>{company}</span>
                      {selectedCompany === company && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
