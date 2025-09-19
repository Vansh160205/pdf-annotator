const { v4: uuidv4 } = require('uuid');
const cloudStorageService = require('../services/cloudStorage');
const CloudFile = require('../models/CloudFile');
const PDF = require('../models/PDF');
const path = require('path');
const fs = require('fs');

class CloudStorageController {
  // Get Google Drive authorization URL
  async getAuthUrl(req, res, next) {
    try {
      const authUrl = cloudStorageService.generateAuthUrl();
      
      res.json({
        success: true,
        authUrl
      });
    } catch (error) {
      console.error('Get auth URL error:', error);
      next(error);
    }
  }

  async handleCallback(req, res) {
    console.log('🔄 OAuth callback received');
    console.log('📋 Query params:', req.query);
    console.log('📋 Request URL:', req.url);
    
    try {
      const { code, error, state } = req.query;
      
      if (error) {
        console.log('❌ OAuth error received:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/auth-callback.html?error=${encodeURIComponent(error)}`);
      }
      
      if (!code) {
        console.log('❌ No authorization code received');
        return res.redirect(`${process.env.FRONTEND_URL}/auth-callback.html?error=no_code`);
      }

      console.log('🔄 Exchanging code for tokens...');
      const result = await cloudStorageService.getTokensFromCode(code);
      
      if (!result.success) {
        console.log('❌ Token exchange failed:', result.error);
        return res.redirect(`${process.env.FRONTEND_URL}/auth-callback.html?error=${encodeURIComponent(result.error)}`);
      }

      const accessToken = result.tokens.access_token;
      const expiryDate = result.tokens.expiry_date || (Date.now() + 3600000);

      console.log('✅ Token exchange successful');
      console.log('📝 Access token length:', accessToken?.length);
      console.log('📝 Expiry date:', new Date(expiryDate));

      const successUrl = `${process.env.FRONTEND_URL}/auth-callback.html?access_token=${accessToken}&expiry=${expiryDate}`;
      console.log('🔄 Redirecting to:', successUrl);
      res.redirect(successUrl);
      
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth-callback.html?error=token_exchange_failed`);
    }
  }

  // NEW METHOD: Get user's PDFs
  async getUserPDFs(req, res, next) {
  try {
    // First, get all pdfUuids that are already uploaded to cloud storage
    const uploadedPdfUuids = await CloudFile.find({
      userId: req.user._id
    }).distinct('pdfUuid');

    console.log(`🔍 Found ${uploadedPdfUuids.length} PDFs already uploaded to cloud for user ${req.user._id}`);

    // Then, get PDFs that are NOT in the uploaded list
    const userPDFs = await PDF.find({
      userId: req.user._id,
      uuid: { $nin: uploadedPdfUuids }  // Not in uploaded PDFs
    })
    .select('uuid originalName filename fileSize createdAt')
    .sort({ createdAt: -1 });

    console.log(`📋 Found ${userPDFs.length} PDFs not yet uploaded to cloud for user ${req.user._id}`);

    res.json({
      success: true,
      pdfs: userPDFs.map(pdf => ({
        uuid: pdf.uuid,
        originalName: pdf.originalName,
        filename: pdf.filename,
        fileSize: pdf.fileSize,
        createdAt: pdf.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Get user PDFs error:', error);
    next(error);
  }
}

  // Upload PDF to Google Drive - FIXED VERSION
  async uploadPDF(req, res, next) {
    try {
      const { pdfUuid } = req.params;
      const { accessToken } = req.body;

      console.log('📤 Upload request received:', {
        pdfUuid,
        hasAccessToken: !!accessToken,
        userId: req.user?._id
      });

      // Validate required parameters
      if (!pdfUuid) {
        return res.status(400).json({
          success: false,
          error: 'PDF UUID is required'
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
      }

      // Verify PDF belongs to user
      const pdf = await PDF.findOne({
        uuid: pdfUuid,
        userId: req.user._id
      });

      console.log('📄 PDF lookup result:', {
        found: !!pdf,
        filename: pdf?.filename,
        originalName: pdf?.originalName,
        fileSize: pdf?.fileSize
      });

      if (!pdf) {
        return res.status(404).json({
          success: false,
          error: 'PDF not found or does not belong to user'
        });
      }

      // Check if PDF has a filename
      if (!pdf.filename) {
        console.error('❌ PDF record missing filename:', pdf);
        return res.status(400).json({
          success: false,
          error: 'PDF record is corrupted - missing file name'
        });
      }

      // Construct file path
      const filePath = path.join(__dirname, '../../uploads', pdf.filename);
      console.log('📁 File path:', filePath);
      
      // Check if file exists on disk
      if (!fs.existsSync(filePath)) {
        console.error('❌ File not found on disk:', filePath);
        return res.status(404).json({
          success: false,
          error: `PDF file not found on server: ${pdf.filename}`
        });
      }

      // Get file stats for debugging
      const stats = fs.statSync(filePath);
      console.log('📊 File stats:', {
        size: stats.size,
        exists: true
      });

      // Use original name for upload
      const uploadfilename = pdf.originalName || pdf.filename;
      console.log('📝 Upload file name:', uploadfilename);

      // Upload to Google Drive
      console.log('🚀 Starting Google Drive upload...');
      const result = await cloudStorageService.uploadToGoogleDrive(
        filePath,
        uploadfilename,
        accessToken
      );

      if (!result.success) {
        console.error('❌ Google Drive upload failed:', result);
        return res.status(400).json(result);
      }

      console.log('✅ Google Drive upload successful:', result);

      // Save cloud file record
      const cloudFile = new CloudFile({
        uuid: uuidv4(),
        userId: req.user._id,
        pdfUuid: pdfUuid,
        service: 'googledrive',
        cloudFileId: result.fileId,
        fileName: result.name,
        webViewLink: result.webViewLink,
        downloadLink: result.downloadLink,
        fileSize: result.size
      });

      await cloudFile.save();

      console.log('💾 Cloud file record saved:', {
        uuid: cloudFile.uuid,
        cloudFileId: cloudFile.cloudFileId,
        filename: cloudFile.fileName
      });

      res.json({
        success: true,
        message: 'PDF uploaded to Google Drive successfully',
        cloudFile: {
          uuid: cloudFile.uuid,
          cloudFileId: cloudFile.cloudFileId,
          fileName: cloudFile.fileName,
          webViewLink: cloudFile.webViewLink,
          downloadLink: cloudFile.downloadLink,
          createdAt: cloudFile.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Upload PDF error:', error);
      console.error('Error stack:', error.stack);
      next(error);
    }
  }

  // Import PDF from Google Drive
  async importPDF(req, res, next) {
    try {
      const { fileId, accessToken, filename } = req.body;

      console.log('📥 Import request received:', {
        fileId,
        hasAccessToken: !!accessToken,
        filename
      });

      // Validate required parameters
      if (!fileId || !accessToken || !filename) {
        return res.status(400).json({
          success: false,
          error: 'File ID, access token, and file name are required'
        });
      }

      // Download from Google Drive
      const result = await cloudStorageService.downloadFromGoogleDrive(fileId, accessToken);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Generate unique filename
      const uuid = uuidv4();
      const sanitizedfilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileExtension = path.extname(sanitizedfilename) || '.pdf';
      const uniquefilename = `${uuid}${fileExtension}`;
      const filePath = path.join(__dirname, '../../uploads', uniquefilename);

      console.log('💾 Saving imported file:', {
        originalName: filename,
        uniquefilename,
        filePath
      });

      // Save file to disk
      const writeStream = fs.createWriteStream(filePath);
      result.stream.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Get file stats
      const stats = fs.statSync(filePath);

      // Create PDF record
      const pdf = new PDF({
        uuid,
        userId: req.user._id,
        originalName: filename,
        filename: uniquefilename,
        fileSize: stats.size,
        mimeType: 'application/pdf'
      });

      await pdf.save();

      // Create cloud file record
      const cloudFile = new CloudFile({
        uuid: uuidv4(),
        userId: req.user._id,
        pdfUuid: uuid,
        service: 'googledrive',
        cloudFileId: fileId,
        filename: filename,
        fileSize: result.metadata.size
      });

      await cloudFile.save();

      console.log('✅ PDF imported successfully:', {
        pdfUuid: uuid,
        filename: filename,
        fileSize: stats.size
      });

      res.json({
        success: true,
        message: 'PDF imported from Google Drive successfully',
        pdf: {
          uuid: pdf.uuid,
          originalName: pdf.originalName,
          fileSize: pdf.fileSize,
          createdAt: pdf.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Import PDF error:', error);
      next(error);
    }
  }

  // List Google Drive files
  async listFiles(req, res, next) {
    try {
      const { accessToken, pageToken } = req.query;

      console.log('📋 List files request:', {
        hasAccessToken: !!accessToken,
        pageToken
      });

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
      }

      const result = await cloudStorageService.listFilesFromGoogleDrive(accessToken, {
        pageToken,
        pageSize: 20
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        files: result.files,
        nextPageToken: result.nextPageToken
      });
    } catch (error) {
      console.error('❌ List files error:', error);
      next(error);
    }
  }

  // Get cloud files for a PDF
  async getCloudFiles(req, res, next) {
    try {
      const { pdfUuid } = req.params;

      const cloudFiles = await CloudFile.find({
        pdfUuid,
        userId: req.user._id
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        cloudFiles: cloudFiles.map(file => ({
          uuid: file.uuid,
          service: file.service,
          cloudFileId: file.cloudFileId,
          filename: file.filename,
          webViewLink: file.webViewLink,
          downloadLink: file.downloadLink,
          fileSize: file.fileSize,
          lastSynced: file.lastSynced,
          createdAt: file.createdAt
        }))
      });
    } catch (error) {
      console.error('❌ Get cloud files error:', error);
      next(error);
    }
  }

  // Create shareable link
  async createShareableLink(req, res, next) {
    try {
      const { cloudFileUuid } = req.params;
      const { accessToken } = req.body;

      // Find cloud file
      const cloudFile = await CloudFile.findOne({
        uuid: cloudFileUuid,
        userId: req.user._id
      });

      if (!cloudFile) {
        return res.status(404).json({
          success: false,
          error: 'Cloud file not found'
        });
      }

      const result = await cloudStorageService.createShareableLink(
        cloudFile.cloudFileId,
        accessToken
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Update cloud file record
      cloudFile.shareLink = result.viewLink;
      cloudFile.downloadLink = result.downloadLink;
      await cloudFile.save();

      res.json({
        success: true,
        shareLink: result.viewLink,
        downloadLink: result.downloadLink
      });
    } catch (error) {
      console.error('❌ Create shareable link error:', error);
      next(error);
    }
  }

  // Delete cloud file
  async deleteCloudFile(req, res, next) {
    try {
      const { cloudFileUuid } = req.params;
      const { accessToken, deleteFromCloud } = req.body;

      // Find cloud file
      const cloudFile = await CloudFile.findOne({
        uuid: cloudFileUuid,
        userId: req.user._id
      });

      if (!cloudFile) {
        return res.status(404).json({
          success: false,
          error: 'Cloud file not found'
        });
      }

      // Delete from cloud storage if requested
      if (deleteFromCloud) {
        const result = await cloudStorageService.deleteFromGoogleDrive(
          cloudFile.cloudFileId,
          accessToken
        );

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: 'Failed to delete from Google Drive: ' + result.error
          });
        }
      }

      // Delete cloud file record
      await CloudFile.deleteOne({ _id: cloudFile._id });

      console.log('🗑️ Cloud file deleted:', cloudFileUuid);

      res.json({
        success: true,
        message: 'Cloud file deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete cloud file error:', error);
      next(error);
    }
  }
}

module.exports = new CloudStorageController();