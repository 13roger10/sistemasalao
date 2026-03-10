package com.belezza.api.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.time.Duration;
import java.util.UUID;

/**
 * Service for managing file uploads to AWS S3.
 * Handles image storage for the Social Studio module.
 */
@Service
@Slf4j
public class S3Service {

    @Value("${belezza.aws.s3.bucket}")
    private String bucketName;

    @Value("${belezza.aws.s3.region}")
    private String region;

    @Value("${belezza.aws.s3.access-key}")
    private String accessKey;

    @Value("${belezza.aws.s3.secret-key}")
    private String secretKey;

    @Value("${belezza.aws.s3.cloudfront-domain:}")
    private String cloudfrontDomain;

    @Value("${belezza.aws.s3.presigned-url-expiration:3600}")
    private long presignedUrlExpiration;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    @PostConstruct
    public void init() {
        if (accessKey == null || accessKey.isEmpty()) {
            log.warn("AWS S3 credentials not configured. S3 functionality will be disabled.");
            return;
        }

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        this.s3Client = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .build();

        this.s3Presigner = S3Presigner.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))
            .build();

        log.info("S3Service initialized successfully for bucket: {}", bucketName);
    }

    @PreDestroy
    public void cleanup() {
        if (s3Client != null) {
            s3Client.close();
        }
        if (s3Presigner != null) {
            s3Presigner.close();
        }
    }

    /**
     * Upload a file to S3 with a specific prefix (folder).
     *
     * @param file   the file to upload
     * @param prefix the S3 prefix/folder (e.g., "originals/", "edited/")
     * @return the S3 key of the uploaded file
     */
    public String uploadFile(MultipartFile file, String prefix) throws IOException {
        validateClient();

        String fileName = generateFileName(file.getOriginalFilename());
        String key = prefix + fileName;

        try (InputStream inputStream = file.getInputStream()) {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, file.getSize()));

            log.info("File uploaded successfully: {}", key);
            return key;
        } catch (S3Exception e) {
            log.error("Error uploading file to S3: {}", e.awsErrorDetails().errorMessage(), e);
            throw new IOException("Failed to upload file to S3", e);
        }
    }

    /**
     * Upload raw bytes to S3 (for AI-processed images).
     *
     * @param data        the byte array data
     * @param contentType the content type
     * @param prefix      the S3 prefix/folder
     * @return the S3 key of the uploaded file
     */
    public String uploadBytes(byte[] data, String contentType, String prefix) throws IOException {
        validateClient();

        String fileName = generateFileName("image.jpg");
        String key = prefix + fileName;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) data.length)
                .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(data));

            log.info("Bytes uploaded successfully: {}", key);
            return key;
        } catch (S3Exception e) {
            log.error("Error uploading bytes to S3: {}", e.awsErrorDetails().errorMessage(), e);
            throw new IOException("Failed to upload bytes to S3", e);
        }
    }

    /**
     * Get public URL for an S3 object.
     * Uses CloudFront domain if configured, otherwise S3 URL.
     *
     * @param key the S3 key
     * @return the public URL
     */
    public String getPublicUrl(String key) {
        if (cloudfrontDomain != null && !cloudfrontDomain.isEmpty()) {
            return cloudfrontDomain + "/" + key;
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
    }

    /**
     * Generate a presigned URL for temporary access to a private object.
     *
     * @param key the S3 key
     * @return the presigned URL
     */
    public URL getPresignedUrl(String key) {
        validateClient();

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofSeconds(presignedUrlExpiration))
            .getObjectRequest(getObjectRequest)
            .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url();
    }

    /**
     * Delete a file from S3.
     *
     * @param key the S3 key to delete
     */
    public void deleteFile(String key) {
        validateClient();

        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("File deleted successfully: {}", key);
        } catch (S3Exception e) {
            log.error("Error deleting file from S3: {}", e.awsErrorDetails().errorMessage(), e);
        }
    }

    /**
     * Check if a file exists in S3.
     *
     * @param key the S3 key
     * @return true if exists, false otherwise
     */
    public boolean fileExists(String key) {
        validateClient();

        try {
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            s3Client.headObject(headObjectRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            log.error("Error checking file existence: {}", e.awsErrorDetails().errorMessage(), e);
            return false;
        }
    }

    /**
     * Get file size in bytes.
     *
     * @param key the S3 key
     * @return file size in bytes, or 0 if not found
     */
    public long getFileSize(String key) {
        validateClient();

        try {
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            HeadObjectResponse response = s3Client.headObject(headObjectRequest);
            return response.contentLength();
        } catch (S3Exception e) {
            log.error("Error getting file size: {}", e.awsErrorDetails().errorMessage(), e);
            return 0;
        }
    }

    /**
     * Generate a unique file name with UUID.
     *
     * @param originalFilename the original filename
     * @return a unique filename
     */
    private String generateFileName(String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    private void validateClient() {
        if (s3Client == null) {
            throw new IllegalStateException("S3 client not initialized. Check AWS credentials configuration.");
        }
    }
}
