import React from "react";
import ReactDOM from "react-dom/client";
import { BentoGrid, BentoItem } from "../components/ui/bento-grid";

// Log para depuración
console.log("Ad Requests script loaded");
import {
    CheckCircle,
    AlertCircle,
    Clock,
    FileText,
    PenTool,
    ThumbsUp,
    Undo,
} from "lucide-react";

// Mapeo de estados a iconos y colores
const statusIconMap = {
    NEW: <FileText className="w-4 h-4 text-blue-500" />,
    DRAFT: <PenTool className="w-4 h-4 text-orange-500" />,
    FILLED: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    SUBMITTED: <Clock className="w-4 h-4 text-purple-500" />,
    COMPLETED: <ThumbsUp className="w-4 h-4 text-green-500" />,
    REOPENED: <Undo className="w-4 h-4 text-red-500" />,
    DEFAULT: <AlertCircle className="w-4 h-4 text-gray-500" />,
};

// Interfaz para los datos de ad_requests recibidos del backend
interface AdRequest {
    ad_request_id: number;
    ad_library_name: string;
    status: string;
    created_at: string;
    updated_at: string;
    canvas_size: string;
    tags: string[];
    industries: string[];
}

// Función para formatear la fecha
function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Función para convertir AdRequest a BentoItem
function adRequestToBentoItem(adRequest: AdRequest): BentoItem {
    return {
        title: adRequest.ad_library_name,
        meta: `ID: ${adRequest.ad_request_id}`,
        description: adRequest.industries.length > 0 
            ? `Industrias: ${adRequest.industries.join(", ")}` 
            : "Sin industrias asociadas",
        icon: statusIconMap[adRequest.status] || statusIconMap.DEFAULT,
        status: adRequest.status,
        tags: adRequest.tags,
        cta: "Ver detalles",
        hasPersistentHover: false,
    };
}

// Componente principal
function AdRequestsGrid() {
    // Obtener los datos del elemento script con id "ad-requests-data"
    const dataElement = document.getElementById("ad-requests-data");
    console.log("Data element:", dataElement);
    
    if (dataElement) {
        console.log("Data element content:", dataElement.textContent);
    }
    
    const adRequests: AdRequest[] = dataElement 
        ? JSON.parse(dataElement.textContent || "[]") 
        : [];
    
    console.log("Parsed ad requests:", adRequests);
    console.log("Number of ad requests:", adRequests.length);
    
    // Convertir los datos a formato BentoItem
    const bentoItems = adRequests.map(adRequestToBentoItem);
    console.log("Bento items:", bentoItems);

    return (
        <div className="ad-requests-container">
            <BentoGrid items={bentoItems} />
        </div>
    );
}

// Función para inicializar el componente React
function initAdRequestsGrid() {
    console.log("Initializing Ad Requests Grid");
    const container = document.getElementById("ad-requests-grid");
    console.log("Container:", container);
    
    if (container) {
        try {
            const root = ReactDOM.createRoot(container);
            root.render(<AdRequestsGrid />);
            console.log("Ad Requests Grid rendered");
        } catch (error) {
            console.error("Error rendering Ad Requests Grid:", error);
        }
    } else {
        console.error("Container not found: ad-requests-grid");
    }
}

// Intentar renderizar inmediatamente si el DOM ya está listo
if (document.readyState === "complete" || document.readyState === "interactive") {
    console.log("DOM already ready, initializing immediately");
    setTimeout(initAdRequestsGrid, 100); // Pequeño retraso para asegurar que todo esté cargado
} else {
    // Si no, esperar a que el DOM esté listo
    console.log("Waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", initAdRequestsGrid);
}

export { AdRequestsGrid };
