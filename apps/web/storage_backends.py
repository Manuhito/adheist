from storages.backends.s3boto3 import S3Boto3Storage
import boto3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class PublicMediaStorage(S3Boto3Storage):
    """
    Storage for media files using pre-signed URLs.
    This allows secure access to private S3 files without making the bucket public.
    """
    location = "media"
    file_overwrite = False
    
    def url(self, name, parameters=None, expire=None, http_method=None):
        """
        Generate a pre-signed URL for the file.
        
        Args:
            name: Name of the file
            parameters: Additional parameters for the URL
            expire: Expiration time in seconds (default: 86400 = 1 day)
            http_method: HTTP method for the URL (default: GET)
            
        Returns:
            Pre-signed URL for the file
        """
        # Default expiration to 1 day (86400 seconds)
        if expire is None:
            expire = 86400
            
        # Get AWS settings from Django settings
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2')
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3')
        
        try:
            # Create a boto3 client with explicit region
            s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            
            # Construct the full key with location prefix
            key = name
            if self.location:
                # Ensure we don't have double slashes
                location = self.location.rstrip('/')
                key = f"{location}/{name.lstrip('/')}"
            
            # Generate the pre-signed URL
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': key,
                },
                ExpiresIn=expire,
                HttpMethod=http_method or 'GET',
            )
            
            return url
        except Exception as e:
            # Log the error and fall back to default implementation
            logger.error(f"Error generating pre-signed URL: {str(e)}")
            return super().url(name, parameters, expire, http_method)


class MarketingStorage(S3Boto3Storage):
    """
    Storage for marketing page images in S3.
    Public access for static marketing assets (images for landing pages, industries, etc.)
    Location: media/marketing/ in S3 bucket
    """
    location = "media/marketing"
    file_overwrite = False
    default_acl = 'public-read'
    querystring_auth = False  # No pre-signed URLs needed for public images
    
    def url(self, name, parameters=None, expire=None, http_method=None):
        """
        Generate a public URL for marketing images.
        Since these are public, we don't need pre-signed URLs.
        """
        # Get AWS settings
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3-prod')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2')
        
        # Construct the full key with location prefix
        key = name.lstrip('/')
        if self.location:
            location = self.location.rstrip('/')
            full_key = f"{location}/{key}"
        else:
            full_key = key
        
        # Return public S3 URL
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/{full_key}"


class IndustriesStorage(S3Boto3Storage):
    """
    Storage for industry-specific images in S3.
    Public access for static industry assets.
    Location: media/marketing/industries/ in S3 bucket
    """
    location = "media/marketing/industries"
    file_overwrite = False
    default_acl = 'public-read'
    querystring_auth = False
    
    def url(self, name, parameters=None, expire=None, http_method=None):
        """
        Generate a public URL for industry images.
        """
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'adheist-s3-prod')
        region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-2')
        
        key = name.lstrip('/')
        if self.location:
            location = self.location.rstrip('/')
            full_key = f"{location}/{key}"
        else:
            full_key = key
        
        return f"https://{bucket_name}.s3.{region}.amazonaws.com/{full_key}"
