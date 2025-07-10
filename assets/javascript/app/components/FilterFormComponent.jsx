import React, { useEffect } from 'react';
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
import { useTranslation } from '../../lib/useTranslation';
import { useFilterCache } from './StepOneComponent';

// Esquema de validación con zod
const FilterFormSchema = z.object({
  industries: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Componente de formulario para seleccionar múltiples industrias y etiquetas
 * Utiliza react-hook-form y zod para validación
 * @param {Object} props - Component props
 * @param {string[]} props.selectedIndustries - Currently selected industries
 * @param {string[]} props.selectedTags - Currently selected tags
 * @param {Function} props.onIndustriesChange - Callback when industries selection changes
 * @param {Function} props.onTagsChange - Callback when tags selection changes
 */
export const FilterFormComponent = ({
  selectedIndustries = [],
  selectedTags = [],
  onIndustriesChange,
  onTagsChange
}) => {
  const { t } = useTranslation();
  // Usar el contexto de caché para obtener industrias y etiquetas
  const { industries: industriesList, tags: tagsList, isLoading, loadFilterData } = useFilterCache();

  // Configurar el formulario con react-hook-form
  const form = useForm({
    resolver: zodResolver(FilterFormSchema),
    defaultValues: {
      industries: selectedIndustries,
      tags: selectedTags,
    },
  });
  
  // Asegurar que los datos estén cargados
  useEffect(() => {
    const componentMountTime = performance.now();
    const cacheId = window._filterCacheId || 'unknown';
    
    console.log(`[FILTER FORM] 📊 [${cacheId}] Componente montado - timestamp: ${new Date().toISOString()}`);
    
    // Cargar datos si aún no están disponibles
    if (industriesList.length === 0 || tagsList.length === 0) {
      console.log(`[FILTER FORM] 🔄 [${cacheId}] Solicitando datos de filtros - caché vacía`);
      const startTime = performance.now();
      
      loadFilterData().then((data) => {
        const endTime = performance.now();
        console.log(`[FILTER FORM] ⏱️ [${cacheId}] Datos recibidos en ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`[FILTER FORM] 💾 [${cacheId}] Total tiempo desde montaje: ${(endTime - componentMountTime).toFixed(2)}ms`);
      });
    } else {
      console.log(`[FILTER FORM] ✅ [${cacheId}] Usando datos en caché - industries: ${industriesList.length}, tags: ${tagsList.length}`);
      console.log(`[FILTER FORM] 💾 [${cacheId}] Tiempo de montaje con caché: ${(performance.now() - componentMountTime).toFixed(2)}ms`);
      
      // Medir el tiempo de renderizado inicial de los componentes MultipleSelector
      setTimeout(() => {
        const renderTime = performance.now() - componentMountTime;
        console.log(`[PERF] ⚡️ [${cacheId}] Tiempo total de renderizado con virtualización: ${renderTime.toFixed(2)}ms`);
      }, 0);
    }
    
    // Registrar el rendimiento en localStorage para diagnóstico
    try {
      const formPerfData = JSON.parse(localStorage.getItem('filterFormPerfData') || '[]');
      formPerfData.push({
        timestamp: new Date().toISOString(),
        cacheId,
        hasCachedData: industriesList.length > 0 && tagsList.length > 0,
        industriesCount: industriesList.length,
        tagsCount: tagsList.length,
        mountTime: performance.now() - componentMountTime
      });
      localStorage.setItem('filterFormPerfData', JSON.stringify(formPerfData.slice(-10))); // Guardar solo los últimos 10
    } catch (e) {
      console.error('Error guardando datos de rendimiento del formulario:', e);
    }
  }, [industriesList.length, tagsList.length, loadFilterData]);

  // Sincronizar el formulario cuando cambian las props
  useEffect(() => {
    form.reset({
      industries: selectedIndustries,
      tags: selectedTags
    });
  }, [selectedIndustries, selectedTags, form]);

  // Manejar envío del formulario
  const onSubmit = (data) => {
    console.log('Filtros aplicados:', data);
    // No es necesario hacer nada aquí ya que los cambios se manejan en tiempo real
  };

  return (
    <div className="flex-1 flex">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-4 w-full">
          {/* Campo de industrias */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center">
              <Factory className="h-4 w-4 mr-2" />
              <h3 className="text-base font-medium">{t('filter.industries', 'Industries')}</h3>
            </div>

            <FormField
              control={form.control}
              name="industries"
              render={({ field }) => {
                // Pre-filtrar las opciones disponibles para evitar mostrar elementos ya seleccionados
                const availableIndustries = React.useMemo(() => {
                  return industriesList.filter(
                    industry => !field.value.includes(industry.value)
                  );
                }, [industriesList, field.value]);

                return (
                  <FormItem>
                    <FormControl>
                      <MultipleSelector
                        value={industriesList.filter(industry =>
                          field.value.includes(industry.value)
                        )}
                        options={availableIndustries}
                        placeholder={t('filter.select_industries', 'Select industries')}
                        emptyIndicator={
                          isLoading ? (
                            <p className="text-center text-sm">{t('filter.loading_industries', 'Loading industries...')}</p>
                          ) : industriesList.length === 0 ? (
                            <p className="text-center text-sm">{t('filter.no_industries', 'No industries available')}</p>
                          ) : (
                            <p className="text-center text-sm">{t('filter.no_matching_industries', 'No matching industries')}</p>
                          )
                        }
                        // Mostrar indicador de optimización
                        className={industriesList.length > 100 ? 'border-green-500 border-opacity-50' : ''}
                        disabled={isLoading}
                        onChange={(options) => {
                          const startTime = performance.now();
                          const values = options.map(option => option.value);
                          field.onChange(values);
                          // Notificar al componente padre sobre el cambio
                          onIndustriesChange(values);
                          console.log(`[FILTER FORM] 📈 Cambio de industrias procesado en ${(performance.now() - startTime).toFixed(2)}ms`);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }
              }
            />
          </div>

          {/* Campo de etiquetas */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              <h3 className="text-base font-medium">{t('filter.tags', 'Ad description Keywords')}</h3>
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => {
                // Pre-filtrar las opciones disponibles para evitar mostrar elementos ya seleccionados
                const availableTags = React.useMemo(() => {
                  return tagsList.filter(
                    tag => !field.value.includes(tag.value)
                  );
                }, [tagsList, field.value]);

                return (
                  <FormItem>
                    <FormControl>
                      <MultipleSelector
                        value={tagsList.filter(tag =>
                          field.value.includes(tag.value)
                        )}
                        options={availableTags}
                        placeholder={t('filter.select_tags', 'Search by Ad description Keywords')}
                        emptyIndicator={
                          isLoading ? (
                            <p className="text-center text-sm">{t('filter.loading_tags', 'Loading tags...')}</p>
                          ) : tagsList.length === 0 ? (
                            <p className="text-center text-sm">{t('filter.no_tags', 'No tags available')}</p>
                          ) : (
                            <p className="text-center text-sm">{t('filter.no_matching_tags', 'No matching tags')}</p>
                          )
                        }
                        // Mostrar indicador de optimización
                        className={tagsList.length > 100 ? 'border-green-500 border-opacity-50' : ''}
                        disabled={isLoading}
                        onChange={(options) => {
                          const startTime = performance.now();
                          const values = options.map(option => option.value);
                          field.onChange(values);
                          // Notificar al componente padre sobre el cambio
                          onTagsChange(values);
                          console.log(`[FILTER FORM] 🏷️ Cambio de tags procesado en ${(performance.now() - startTime).toFixed(2)}ms`);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }
              }
            />
          </div>
        </form>
      </Form>
    </div>
  );
};
