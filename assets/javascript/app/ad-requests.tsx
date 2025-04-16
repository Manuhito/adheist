import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BentoGrid, BentoItem } from "../components/ui/bento-grid";
import { ButtonColorful } from "../components/ui/button-colorful";
import { AlertNotification } from "../components/ui/alert-notification";
import { cn } from "../lib/utils";

// Debug log
console.log("Ad Requests script loaded");
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
}

// Function to format the date
function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Function to convert AdRequest to BentoItem
function adRequestToBentoItem(adRequest: AdRequest): BentoItem {
    // Determine the appropriate URL based on status
    const getRedirectUrl = (status: string, id: number): string | null => {
        // For DRAFT, NEW, FILLED statuses, redirect to create_adrequest_page
        if (['DRAFT', 'NEW', 'FILLED'].includes(status)) {
            return `/ads/create/${id}/`;
        }
        // For COMPLETE status, redirect to the details page
        else if (status === 'COMPLETED') {
            return `/ads/request/${id}/details/`;
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
        title: adRequest.ad_library_name,
        meta: `${adRequest.canvas_size}`,
        description: adRequest.industries.length > 0 
            ? `Industries: ${adRequest.industries.join(", ")}` 
            : "No associated industries",
        icon: statusIconMap[adRequest.status] || statusIconMap.DEFAULT,
        status: adRequest.display_status,  // Use display_status instead of status
        tags: adRequest.tags,
        cta: "View details",
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
                console.log('Latest ad request data:', data);
                
                // Check if the status is SUBMITTED or REOPENED
                if (['SUBMITTED', 'REOPENED'].includes(data.status)) {
                    // Create a notification element
                    const notificationContainer = document.createElement('div');
                    notificationContainer.id = 'ad-request-notification-container';
                    document.body.appendChild(notificationContainer);
                    
                    // Render the notification
                    const notificationRoot = ReactDOM.createRoot(notificationContainer);
                    const message = `This ad request is currently in ${data.status.toLowerCase()} status. Please wait for it to be processed.`;
                    
                    notificationRoot.render(
                        React.createElement(AlertNotification, {
                            message: message,
                            variant: "info" as "info" | "warning" | "error" | "success",
                            duration: 5000,
                            onClose: () => {
                                // Remove the notification container when closed
                                if (notificationContainer.parentNode) {
                                    notificationContainer.parentNode.removeChild(notificationContainer);
                                }
                            }
                        })
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
                console.error('Error checking ad request status:', error);
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
async function createNewAdRequest() {
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
        console.log('New ad request created:', data);
        
        // Redirect to the create_adrequest_page with the ID as a URL parameter
        if (data && data.id) {
            window.location.href = `/ads/create/${data.id}/`;
        } else {
            console.error('No ID returned from create ad request API');
            // Fallback to reload if no ID is returned
            window.location.reload();
        }
    } catch (error) {
        console.error('Error creating ad request:', error);
        alert('Error creating ad request. Please try again.');
    }
}

// Main component
function AdRequestsGrid() {
    // State for notification
    const [notification, setNotification] = useState<{ message: string; variant: "warning" | "error" | "success" | "info" } | null>(null);

    // Get data from script element with id "ad-requests-data"
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
    
    // Convert data to BentoItem format
    const bentoItems = adRequests.map(adRequestToBentoItem);
    console.log("Bento items:", bentoItems);

    return (
        <div className="ad-requests-container">
            {/* Notification */}
            {notification && (
                React.createElement(AlertNotification, {
                    message: notification.message,
                    variant: notification.variant,
                    onClose: () => setNotification(null)
                })
            )}
            
            {/* Create new ad request button */}
            <div className="flex justify-center my-4">
                <ButtonColorful 
                    label="Create New Ad Request"
                    onClick={createNewAdRequest}
                />
            </div>
            
            <BentoGrid items={bentoItems} />
        </div>
    );
}

// Function to initialize the React component
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

// Try to render immediately if the DOM is already ready
if (document.readyState === "complete" || document.readyState === "interactive") {
    console.log("DOM already ready, initializing immediately");
    setTimeout(initAdRequestsGrid, 100); // Small delay to ensure everything is loaded
} else {
    // Otherwise, wait for the DOM to be ready
    console.log("Waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", initAdRequestsGrid);
}

export { AdRequestsGrid };
