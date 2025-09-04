import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { BentoGrid, BentoItem } from "@/components/ui/bento-grid";
import { ButtonColorful } from "@/components/ui/button-colorful";
import { AlertNotification } from "@/components/ui/alert-notification";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/useTranslation";
import {
    CheckCircle,
    AlertCircle,
    Clock,
    PenTool,
    ThumbsUp,
    Undo,
    PencilRuler,
    CircleCheckBig,
    ArrowUpRight,
} from "lucide-react";

// Declare PostHog types for TypeScript
declare global {
    interface Window {
        posthog?: {
            capture: (event: string, properties?: Record<string, any>) => void;
            identify: (distinctId: string, userProperties?: Record<string, any>) => void;
            people: {
                set: (properties: Record<string, any>) => void;
            };
        };
    }
}

// Componente para mostrar solicitudes de anuncios

// Mapping of statuses to icons and colors
const statusIconMap: Record<string, React.ReactElement> = {
    NEW: <PencilRuler className="w-4 h-4 text-orange-500" />,
    DRAFT: <PencilRuler className="w-4 h-4 text-orange-500" />,
    FILLED: <PencilRuler className="w-4 h-4 text-orange-500" />,
    SUBMITTED: <Clock className="w-4 h-4 text-purple-500" />,
    COMPLETED: <CircleCheckBig className="w-4 h-4 text-green-500" />,
    REOPENED: <Clock className="w-4 h-4 text-purple-500" />,
    DEFAULT: <AlertCircle className="w-4 h-4 text-gray-500" />,
};

// Interface for ad_requests data received from the backend
interface AdRequest {
    ad_request_id: number;
    ad_library_name: string;
    status: string;
    display_status: string;
    created_at: string;
    updated_at: string;
    canvas_size: string;
    tags: string[];
    industries: string[];
    brand_name?: string;
    facebook_page?: string;
}

// Function to format the date
function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    
    // Format as "Month day+th Year"
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    
    // Add the appropriate suffix to the day
    let suffix = "th";
    if (day % 10 === 1 && day !== 11) {
        suffix = "st";
    } else if (day % 10 === 2 && day !== 12) {
        suffix = "nd";
    } else if (day % 10 === 3 && day !== 13) {
        suffix = "rd";
    }
    
    return `${month} ${day}${suffix} ${year}`;
}

// Function to convert AdRequest to BentoItem
function adRequestToBentoItem(adRequest: AdRequest, t: (key: string, fallback?: string) => string): BentoItem {
    // Determine the appropriate URL based on status
    const getRedirectUrl = (status: string, id: number): string | null => {
        // For DRAFT, NEW, FILLED statuses, redirect to create_adrequest_page
        if (['DRAFT', 'NEW', 'FILLED'].includes(status)) {
            return `/ads/create/${id}/`;
        }
        // For COMPLETE status, redirect to the details page
        else if (status === 'COMPLETED') {
            return `/ads/${id}/details/`;
        }
        // For SUBMITTED or REOPENED, don't redirect, show notification instead
        else if (['SUBMITTED', 'REOPENED'].includes(status)) {
            return null; // No redirect
        }
        // Default fallback (for other statuses not yet implemented)
        else {
            return `/ads/create/${id}/`;
        }
    };

    return {
        title: adRequest.brand_name || t('ad_requests.no_brand', "No brand"),
        meta: formatDate(adRequest.created_at),
        description: adRequest.facebook_page || adRequest.ad_library_name || t('ad_requests.no_page', "No Facebook page"),
        icon: statusIconMap[adRequest.status] || statusIconMap.DEFAULT,
        status: adRequest.display_status,  // Use display_status instead of status
        tags: adRequest.tags,
        cta: t('ad_requests.view_details', "View details"),
        hasPersistentHover: false,
        id: adRequest.ad_request_id,
        onClick: async () => {
            try {
                // First, get the latest status from the server
                const response = await fetch(`/ads/adrequest/${adRequest.ad_request_id}/get/`);
                
                if (!response.ok) {
                    throw new Error(`Error fetching ad request: ${response.statusText}`);
                }
                
                const data = await response.json();

                
                // Check if the status is SUBMITTED or REOPENED
                if (['SUBMITTED', 'REOPENED'].includes(data.status)) {
                    // Create a notification element
                    const notificationContainer = document.createElement('div');
                    notificationContainer.id = 'ad-request-notification-container';
                    document.body.appendChild(notificationContainer);
                    
                    // Render the notification
                    const notificationRoot = ReactDOM.createRoot(notificationContainer);
                    const message = t('ad_requests.wait_processing', 'Your image is being generated and may take a few minutes to be available.');
                    
                    notificationRoot.render(
                        <AlertNotification
                            message={message}
                            variant="info"
                            duration={5000}
                            onClose={() => {
                                // Remove the notification container when closed
                                if (notificationContainer.parentNode) {
                                    notificationContainer.parentNode.removeChild(notificationContainer);
                                }
                            }}
                        />
                    );
                    return; // Don't redirect
                }
                
                // Get the appropriate URL based on the latest status
                // Use the ID from the response data (data.id) instead of the original adRequest.ad_request_id
                const redirectUrl = getRedirectUrl(data.status, data.id);
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                }
            } catch (error) {

                // Fallback to using the status we already have
                const redirectUrl = getRedirectUrl(adRequest.status, adRequest.ad_request_id);
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                }
            }
        }
    };
}

// Function to create a new ad request
async function createNewAdRequest(t: (key: string, fallback?: string) => string) {
    try {
        // Get the CSRF token from the cookie
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];

        if (!csrfToken) {
            console.error('CSRF token not found');
            return;
        }

        // Make the POST request to create a new ad request
        const response = await fetch('/ads/adrequest/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            throw new Error(`Error creating ad request: ${response.statusText}`);
        }

        const data = await response.json();

        
        // Redirect to the create_adrequest_page with the ID as a URL parameter
        if (data && data.id) {
            window.location.href = `/ads/create/${data.id}/`;
        } else {

            // Fallback to reload if no ID is returned
            window.location.reload();
        }
    } catch (error) {

        alert(t('ad_requests.error_creating', 'Error creating ad request. Please try again.'));
    }
}

// SSE Event Handler component
function useSSEListener(onEvent: (eventType: string, data: any) => void) {
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Create EventSource connection to the SSE endpoint
        const eventSource = new EventSource('/ads/sse/adrequest-updates/');
        eventSourceRef.current = eventSource;
        
        // Connection opened
        eventSource.addEventListener('connected', (event) => {

            onEvent('connected', JSON.parse(event.data));
        });
        
        // Status change events
        eventSource.addEventListener('status_change', (event) => {

            onEvent('status_change', JSON.parse(event.data));
        });
        
        // Completion events
        eventSource.addEventListener('completion', (event) => {

            onEvent('completion', JSON.parse(event.data));
        });
        
        // Error handling
        eventSource.onerror = (error) => {

            // Try to reconnect after a delay
            setTimeout(() => {
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }
                // The browser will automatically attempt to reconnect
            }, 5000);
        };
        
        // Cleanup on component unmount
        return () => {

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [onEvent]);
    
    return eventSourceRef.current;
}

// Main component
function AdRequestsGrid() {
    const { t } = useTranslation();
    // State for notification
    const [notification, setNotification] = useState<{ message: string; variant: "warning" | "error" | "success" | "info" } | null>(null);
    
    // Get data from script element with id "ad-requests-data"
    const dataElement = document.getElementById("ad-requests-data");

    
    const initialAdRequests: AdRequest[] = dataElement 
        ? JSON.parse(dataElement.textContent || "[]") 
        : [];
    
    // State to hold ad requests (can be updated in real-time)
    const [adRequests, setAdRequests] = useState<AdRequest[]>(initialAdRequests);
    
    // Handle SSE events
    const handleSSEEvent = (eventType: string, data: any) => {

        
        if (eventType === 'status_change') {
            // Update the ad request in the list
            setAdRequests(prevRequests => {
                return prevRequests.map(req => {
                    if (req.ad_request_id === data.ad_request_id) {
                        // Update the request with new data
                        return {
                            ...req,
                            status: data.new_status,
                            display_status: data.display_status,
                            updated_at: data.timestamp || req.updated_at,
                            ad_library_name: data.ad_library_name || req.ad_library_name,
                            canvas_size: data.canvas_size || req.canvas_size,
                            tags: data.tags || req.tags,
                            industries: data.industries || req.industries
                        };
                    }
                    return req;
                });
            });
            
            // Show a notification about the status change
            setNotification({
                message: t('ad_requests.status_changed', `Ad request status changed to ${data.display_status}`),
                variant: 'info'
            });
        } else if (eventType === 'completion') {
            // Show a more prominent notification for completion events
            setNotification({
                message: t('ad_requests.completed', 'Your ad request has been completed! Your ad is now available.'),
                variant: 'success'
            });
        }
    };
    
    // Set up SSE listener
    useSSEListener(handleSSEEvent);
    
    // Mostrar alert verde si el flag está presente
    useEffect(() => {
        if (sessionStorage.getItem('ads_success_alert')) {
            setNotification({
                message: t('ad_requests.success_message', 'Your ad request has been processed successfully! Your ad is being generated and may take a few minutes to be available.'),
                variant: 'success',
            });
            sessionStorage.removeItem('ads_success_alert');
        }
    }, [t]);

    // Convert data to BentoItem format
    const bentoItems = adRequests.map(adRequest => adRequestToBentoItem(adRequest, t));

    return (
        <div className="ad-requests-container">
            {/* Notification */}
            {notification && (
                <AlertNotification
                    message={notification.message}
                    variant={notification.variant}
                    onClose={() => setNotification(null)}
                />
            )}
            
            {/* Create new ad request button */}
            <div className="flex justify-center my-4">
                <ButtonColorful 
                    label={t('ad_requests.create_new', "Create New Ad Request")}
                    onClick={() => {
                        // Track event in PostHog before creating new ad request
                        if (window.posthog) {
                            window.posthog.capture('Create Ad Request Button Clicked', {
                                $current_url: window.location.href,
                                timestamp: new Date().toISOString()
                            });
                        }
                        // Call the original function
                        createNewAdRequest(t);
                    }}
                />
            </div>
            
            <BentoGrid items={bentoItems} />
        </div>
    );
}

// Function to initialize the React component
function initAdRequestsGrid() {
        const container = document.getElementById("ad-requests-grid");
    
    if (container) {
        try {
            const root = ReactDOM.createRoot(container);
            root.render(<AdRequestsGrid />);

        } catch (error) {
            console.error('Error initializing AdRequestsGrid:', error);
        }
    } else {
        console.warn('Container #ad-requests-grid not found');
    }
}

// Try to render immediately if the DOM is already ready
if (document.readyState === "complete" || document.readyState === "interactive") {

    setTimeout(initAdRequestsGrid, 100); // Small delay to ensure everything is loaded
} else {
    // Otherwise, wait for the DOM to be ready

    document.addEventListener("DOMContentLoaded", initAdRequestsGrid);
}

export { AdRequestsGrid };
