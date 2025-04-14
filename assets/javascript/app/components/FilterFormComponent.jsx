import React, { useState, useEffect } from 'react';
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from '../../components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '../../components/ui/form';
import MultipleSelector from '../../components/ui/multiselect';
import { Tag, Factory } from 'lucide-react';

// Esquema de validación con zod
const FilterFormSchema = z.object({
  industries: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Componente de formulario para seleccionar múltiples industrias y etiquetas
 * Utiliza react-hook-form y zod para validación
 */
export const FilterFormComponent = () => {
  const [industriesList, setIndustriesList] = useState([]);
  const [tagsList, setTagsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Configurar el formulario con react-hook-form
  const form = useForm({
    resolver: zodResolver(FilterFormSchema),
    defaultValues: {
      industries: [],
      tags: [],
    },
  });

  // Cargar industrias y etiquetas al montar el componente
  useEffect(() => {
    setIsLoading(true);
    
    // Cargar industrias y etiquetas en paralelo
    const fetchIndustries = fetch('/ahbackend/industries/').then(res => res.json());
    const fetchTags = fetch('/ahbackend/tags/').then(res => res.json());
    
    Promise.all([fetchIndustries, fetchTags])
      .then(([industriesData, tagsData]) => {
        // Procesar datos de industrias
        const industryList = industriesData.industries || [];
        // Convertir a formato de opciones para MultipleSelector
        const industryOptions = industryList.map(industry => ({
          value: industry,
          label: industry
        }));
        setIndustriesList(industryOptions);
        console.log('Industrias cargadas:', industryList.length);
        
        // Procesar datos de etiquetas
        const tagList = tagsData.tags || [];
        // Convertir a formato de opciones para MultipleSelector
        const tagOptions = tagList.map(tag => ({
          value: tag,
          label: tag
        }));
        setTagsList(tagOptions);
        console.log('Etiquetas cargadas:', tagList.length);
        
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error al cargar datos de filtros:', error);
        setIsLoading(false);
      });
  }, []);
  
  // Manejar envío del formulario
  const onSubmit = (data) => {
    console.log('Filtros aplicados:', data);
    // Aquí se implementaría la lógica para aplicar los filtros
  };

  return (
    <div className="w-full max-w-md space-y-6 mt-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Campo de industrias */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Factory className="h-4 w-4 mr-2" />
              <h3 className="text-base font-medium">Industrias</h3>
            </div>
            
            <FormField
              control={form.control}
              name="industries"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultipleSelector
                      value={industriesList.filter(industry => 
                        field.value.includes(industry.value)
                      )}
                      options={industriesList}
                      placeholder="Seleccionar industrias"
                      emptyIndicator={
                        isLoading ? (
                          <p className="text-center text-sm">Cargando industrias...</p>
                        ) : (
                          <p className="text-center text-sm">No hay industrias disponibles</p>
                        )
                      }
                      disabled={isLoading}
                      onChange={(options) => {
                        field.onChange(options.map(option => option.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Campo de etiquetas */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              <h3 className="text-base font-medium">Etiquetas</h3>
            </div>
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultipleSelector
                      value={tagsList.filter(tag => 
                        field.value.includes(tag.value)
                      )}
                      options={tagsList}
                      placeholder="Seleccionar etiquetas"
                      emptyIndicator={
                        isLoading ? (
                          <p className="text-center text-sm">Cargando etiquetas...</p>
                        ) : (
                          <p className="text-center text-sm">No hay etiquetas disponibles</p>
                        )
                      }
                      disabled={isLoading}
                      onChange={(options) => {
                        field.onChange(options.map(option => option.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Botón para aplicar filtros */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            Aplicar filtros
          </Button>
        </form>
      </Form>
    </div>
  );
};
