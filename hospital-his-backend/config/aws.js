const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * AWS S3 Configuration
 * Provides S3 client and helper functions for file uploads/downloads
 */

// Initialize S3 Client
const s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
    },
});

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - S3 object key (file path)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<object>} - S3 upload response
 */
const uploadFile = async (fileBuffer, key, contentType) => {
    try {
        const command = new PutObjectCommand({
            Bucket: config.aws.bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        });

        const response = await s3Client.send(command);
        logger.info(`File uploaded to S3: ${key}`);
        return {
            success: true,
            key,
            url: `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`,
        };
    } catch (error) {
        logger.error(`S3 upload error: ${error.message}`);
        throw error;
    }
};

/**
 * Get signed URL for private file access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedFileUrl = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: config.aws.bucketName,
            Key: key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return signedUrl;
    } catch (error) {
        logger.error(`S3 signed URL error: ${error.message}`);
        throw error;
    }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<object>} - S3 delete response
 */
const deleteFile = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: config.aws.bucketName,
            Key: key,
        });

        const response = await s3Client.send(command);
        logger.info(`File deleted from S3: ${key}`);
        return { success: true, key };
    } catch (error) {
        logger.error(`S3 delete error: ${error.message}`);
        throw error;
    }
};

module.exports = {
    s3Client,
    uploadFile,
    getSignedFileUrl,
    deleteFile,
};
