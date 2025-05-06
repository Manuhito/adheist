import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "../../lib/useTranslation";
import { Download } from "lucide-react";

/**
 * AnimatedDownloadButton - A button that animates on hover and downloads the image
 * @param {Object} props - Component props
 * @param {string} props.downloadUrl - URL of the image to download
 * @param {string} props.fileName - Optional filename for the downloaded image
 */
const AnimatedDownloadButton = ({ downloadUrl, fileName }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  // Handle the download click using the proxy endpoint
  const handleDownload = async () => {
    try {
      // Show loading state
      setIsHovered(true);

      // Create the proxy URL with the original URL and filename as parameters
      const proxyUrl = `/ads/proxy-image/?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(fileName || 'image.jpg')}`;

      // Create and click a link to the proxy URL
      // This will trigger the browser's download behavior without CORS issues
      const link = document.createElement('a');
      link.href = proxyUrl;
      link.setAttribute('download', fileName || 'image.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      // Could show an error toast here
    } finally {
      setIsHovered(false);
    }
  };

  return (
    <div className="flex justify-center mt-2 mb-4">
      <motion.button
        onClick={handleDownload}
        initial={{ width: 40, height: 40 }}
        whileHover={{ width: 160 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        transition={{ duration: 0.3 }}
        className="bg-primary flex items-center justify-center overflow-hidden relative rounded-full shadow-md hover:bg-primary/90"
      >
        <motion.div
          className="absolute"
          animate={{
            opacity: isHovered ? 0 : 1,
            scale: isHovered ? 0.8 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          <Download className="h-5 w-5 text-white" />
        </motion.div>

        <motion.div
          className="w-full flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2, delay: isHovered ? 0.1 : 0 }}
        >
          <span className="text-white text-sm font-medium whitespace-nowrap">
            {t("revision.download_image", "Download Image")}
          </span>
        </motion.div>
      </motion.button>
    </div>
  );
};

export default AnimatedDownloadButton;
