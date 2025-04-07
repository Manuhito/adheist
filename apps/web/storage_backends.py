from storages.backends.s3boto3 import S3Boto3Storage


class PublicMediaStorage(S3Boto3Storage):
    location = "media"
    file_overwrite = False
    # ACLs are not supported on this bucket, so we remove the default_acl setting
