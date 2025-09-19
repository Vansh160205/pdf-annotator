const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class CloudStorageService {
  constructor() {
    this.oauth2Client = null;
    this.isConfigured = false;
    this.initializeGoogleDrive();
  }

  initializeGoogleDrive() {
    console.log('🔧 Initializing Google Drive service...');
    
    // Check environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      clientIdPreview: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
      redirectUri: redirectUri || 'NOT SET'
    });

    if (clientId && clientSecret && redirectUri) {
      try {
        this.oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri
        );
        this.isConfigured = true;
        console.log('✅ Google Drive service initialized successfully');
        console.log('🔗 Using redirect URI:', redirectUri);
      } catch (error) {
        console.error('❌ Error initializing Google Drive OAuth client:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️  Google Drive credentials not configured. Missing:');
      if (!clientId) console.warn('  - GOOGLE_CLIENT_ID');
      if (!clientSecret) console.warn('  - GOOGLE_CLIENT_SECRET');
      if (!redirectUri) console.warn('  - GOOGLE_REDIRECT_URI');
      this.isConfigured = false;
    }
  }

  // Check if service is properly configured
  checkConfiguration() {
    if (!this.isConfigured || !this.oauth2Client) {
      throw new Error('Google Drive service is not configured. Please check your environment variables.');
    }
  }

  // Generate OAuth URL
  generateAuthUrl() {
    this.checkConfiguration();
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI
      });
      
      console.log('📝 Generated auth URL successfully');
      console.log('🔗 Using redirect URI:', process.env.GOOGLE_REDIRECT_URI);
      console.log('🔗 Full auth URL:', authUrl);
      return authUrl;
    } catch (error) {
      console.error('❌ Error generating auth URL:', error);
      throw new Error('Failed to generate authorization URL: ' + error.message);
    }
  }

  // Exchange code for tokens
  async getTokensFromCode(code) {
    this.checkConfiguration();
    
    try {
      console.log('🔄 Exchanging code for tokens...');
      console.log('🔗 Using redirect URI:', process.env.GOOGLE_REDIRECT_URI);
      
      // Explicitly set redirect URI here too
      this.oauth2Client.redirectUri = process.env.GOOGLE_REDIRECT_URI;
      
      const { tokens } = await this.oauth2Client.getToken(code);
      console.log('✅ Tokens obtained successfully');
      
      return {
        success: true,
        tokens
      };
    } catch (error) {
      console.error('❌ Error getting tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

 // Upload file to Google Drive
async uploadToGoogleDrive(filePath, fileName, accessToken) {
  this.checkConfiguration();
  
  try {
    console.log('📤 Uploading to Google Drive:', { filePath, fileName });
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Read file content
    const fileContent = await fs.readFile(filePath);
    
    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [] // Optional: specify folder ID if needed
      },
      media: {
        mimeType: 'application/pdf',
        body: require('stream').Readable.from(fileContent)
      },
      fields: 'id,name,size,webViewLink,webContentLink'
    });

    console.log('✅ Google Drive upload successful:', response.data);

    return {
      success: true,
      fileId: response.data.id,
      name: response.data.name,
      size: response.data.size,
      webViewLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink
    };
  } catch (error) {
    console.error('❌ Google Drive upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

  // Download file from Google Drive
  async downloadFromGoogleDrive(fileId, accessToken) {
    this.checkConfiguration();
    
    try {
      console.log('📥 Downloading file from Google Drive:', fileId);
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const drive = google.drive({ version: 'v3', auth });
      
      // Get file metadata first
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size'
      });

      console.log('📄 File metadata:', fileMetadata.data);

      // Download file content
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      console.log('✅ File download stream created');

      return {
        success: true,
        stream: response.data,
        metadata: fileMetadata.data
      };
    } catch (error) {
      console.error('❌ Google Drive download error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // List files from Google Drive
  async listFilesFromGoogleDrive(accessToken, options = {}) {
    this.checkConfiguration();
    
    try {
      console.log('📋 Listing files from Google Drive...');
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const drive = google.drive({ version: 'v3', auth });
      
      const query = options.query || "mimeType='application/pdf' and trashed=false";
      
      const response = await drive.files.list({
        q: query,
        pageSize: options.pageSize || 50,
        pageToken: options.pageToken,
        fields: 'nextPageToken, files(id,name,size,modifiedTime,webViewLink,thumbnailLink)',
        orderBy: 'modifiedTime desc'
      });

      console.log(`✅ Listed ${response.data.files.length} files`);

      return {
        success: true,
        files: response.data.files,
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('❌ Google Drive list error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete file from Google Drive
  async deleteFromGoogleDrive(fileId, accessToken) {
    this.checkConfiguration();
    
    try {
      console.log('🗑️ Deleting file from Google Drive:', fileId);
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const drive = google.drive({ version: 'v3', auth });
      
      await drive.files.delete({
        fileId: fileId
      });

      console.log('✅ File deleted successfully');

      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('❌ Google Drive delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create shareable link
  async createShareableLink(fileId, accessToken) {
    this.checkConfiguration();
    
    try {
      console.log('🔗 Creating shareable link for file:', fileId);
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const drive = google.drive({ version: 'v3', auth });
      
      // Make file publicly readable
      await drive.permissions.create({
        fileId: fileId,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get the file with shareable links
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink,webContentLink'
      });

      console.log('✅ Shareable link created');

      return {
        success: true,
        viewLink: file.data.webViewLink,
        downloadLink: file.data.webContentLink
      };
    } catch (error) {
      console.error('❌ Error creating shareable link:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new CloudStorageService();