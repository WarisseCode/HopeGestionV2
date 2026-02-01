import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { Request } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Configuration for Digital Ocean Spaces
const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT || 'fra1.digitaloceanspaces.com');

const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_KEY || '',
    secretAccessKey: process.env.SPACES_SECRET || '',
    region: process.env.SPACES_REGION || 'fra1',
    s3ForcePathStyle: false,
    signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.SPACES_BUCKET || 'hopegestion-uploads';
const CDN_URL = process.env.SPACES_CDN_URL || `https://${BUCKET_NAME}.${process.env.SPACES_ENDPOINT}`;

/**
 * Upload a file to Digital Ocean Spaces
 * @param file - Multer file object
 * @param folder - Folder path in the bucket (e.g., 'profiles', 'documents')
 * @returns Promise with the file URL
 */
export const uploadToSpaces = async (
    file: Express.Multer.File,
    folder: string = 'uploads'
): Promise<string> => {
    try {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${uuidv4()}${fileExtension}`;

        const params = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype,
            CacheControl: 'max-age=31536000' // 1 year cache
        };

        const result = await s3.upload(params).promise();
        
        // Return CDN URL if available, otherwise S3 URL
        return `${CDN_URL}/${fileName}`;
    } catch (error) {
        console.error('Error uploading to Spaces:', error);
        throw new Error('Failed to upload file to storage');
    }
};

/**
 * Delete a file from Digital Ocean Spaces
 * @param fileUrl - Full URL of the file to delete
 * @returns Promise<boolean>
 */
export const deleteFromSpaces = async (fileUrl: string): Promise<boolean> => {
    try {
        // Extract the key from the URL
        const urlObj = new URL(fileUrl);
        const key = urlObj.pathname.substring(1); // Remove leading slash

        const params = {
            Bucket: BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('Error deleting from Spaces:', error);
        return false;
    }
};

/**
 * Get a signed URL for temporary access to a private file
 * @param fileKey - Key of the file in the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export const getSignedUrl = (fileKey: string, expiresIn: number = 3600): string => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Expires: expiresIn
    };

    return s3.getSignedUrl('getObject', params);
};

/**
 * Multer configuration for memory storage (required for Spaces upload)
 */
export const multerMemoryStorage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});

/**
 * Helper to upload multiple files
 * @param files - Array of Multer files
 * @param folder - Folder path in the bucket
 * @returns Promise with array of file URLs
 */
export const uploadMultipleToSpaces = async (
    files: Express.Multer.File[],
    folder: string = 'uploads'
): Promise<string[]> => {
    try {
        const uploadPromises = files.map(file => uploadToSpaces(file, folder));
        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error('Error uploading multiple files:', error);
        throw new Error('Failed to upload files to storage');
    }
};

export default {
    uploadToSpaces,
    deleteFromSpaces,
    getSignedUrl,
    multerMemoryStorage,
    uploadMultipleToSpaces
};
