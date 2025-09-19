import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { cloudStorageAPI } from '../services/cloudStorageAPI';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { 
  Cloud, Upload, Download, Link, FileText, Trash2, ExternalLink, RefreshCw, X, Check, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const CloudStoragePanel = ({ pdfUuid, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedPDFs, setSelectedPDFs] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);

  const { isAuthenticated, accessToken, isLoading: authLoading, error: authError, authenticate, logout } = useGoogleAuth();

  // Get user's PDFs
  const { data: userPDFs, isLoading: pdfsLoading } = useQuery(
    'userPDFs',
    cloudStorageAPI.getUserPDFs,
    { enabled: isAuthenticated }
  );

  // Upload mutation
  const uploadMutation = useMutation(
    ({ pdfUuid, accessToken }) => cloudStorageAPI.upload({ pdfUuid, accessToken }),
    { onSuccess: () => refetchCloudFiles() }
  );

  // Import mutation
  const importMutation = useMutation(cloudStorageAPI.import, {
    onSuccess: (data) => {
      toast.success('Imported successfully!');
      if (onImport) onImport(data.data.pdf);
    },
  });

  const deleteMutation = useMutation(cloudStorageAPI.deleteCloudFile, {
  onSuccess: () => {
    toast.success('Cloud file deleted successfully!');
    refetchCloudFiles(); // Refresh the cloud files list
  },
  onError: (error) => {
    toast.error('Delete failed: ' + (error.response?.data?.error || error.message));
  }
});

  // List files mutation
  const listFilesMutation = useMutation(cloudStorageAPI.listFiles, {
    onSuccess: (data) => {
      if (nextPageToken) setDriveFiles(prev => [...prev, ...data.data.files]);
      else setDriveFiles(data.data.files);
      setNextPageToken(data.data.nextPageToken);
    },
  });

  // Get cloud files for this PDF
  const { data: cloudFiles, refetch: refetchCloudFiles } = useQuery(
    ['cloudFiles', pdfUuid],
    () => cloudStorageAPI.getCloudFiles(pdfUuid),
    { enabled: !!pdfUuid && isAuthenticated }
  );

  useEffect(() => {
    if (isAuthenticated && accessToken && activeTab === 'browse') loadDriveFiles();
  }, [isAuthenticated, accessToken, activeTab]);

  const loadDriveFiles = (pageToken = null) => {
    setNextPageToken(pageToken);
    listFilesMutation.mutate({ accessToken, pageToken });
  };

  const handlePDFSelection = (pdfUuid, isSelected) => {
    if (isSelected) setSelectedPDFs(prev => [...prev, pdfUuid]);
    else setSelectedPDFs(prev => prev.filter(uuid => uuid !== pdfUuid));
  };

  const handleUploadSelected = async () => {
    if (!accessToken) return toast.error('Not authenticated');
    if (selectedPDFs.length === 0) return toast.error('Select at least one PDF');

    for (const pdfUuid of selectedPDFs) {
      await uploadMutation.mutateAsync({ pdfUuid, accessToken });
    }
    setSelectedPDFs([]);
    toast.success('Uploaded successfully!');
  };
  const handleDelete = (cloudFileUuid) => {
  if (!accessToken) {
    toast.error('Not authenticated with Google Drive');
    return;
  }

  // Show confirmation dialog
  if (window.confirm('Are you sure you want to remove this file from the cloud storage list? This will not delete the file from Google Drive.')) {
    deleteMutation.mutate({
      cloudFileUuid,
      accessToken,
      deleteFromCloud: false // Set to true if you want to delete from Google Drive as well
    });
  }
};

  const handleImport = (file) => {
    if (!accessToken) return toast.error('Not authenticated');
    importMutation.mutate({ fileId: file.id, accessToken, fileName: file.name });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold flex items-center">
            <Cloud className="h-6 w-6 mr-2 text-blue-600" /> Google Drive Integration
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Authentication Status */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-3 ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {isAuthenticated ? 'Connected to Google Drive' : 'Not connected'}
              </span>
            </div>

            {isAuthenticated ? (
              <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50">
                Disconnect
              </button>
            ) : (
              <button onClick={authenticate} disabled={authLoading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                {authLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
                {authLoading ? 'Connecting...' : 'Connect to Google Drive'}
              </button>
            )}
          </div>
          {authError && <div className="mt-2 flex items-center text-red-600 text-sm"><AlertCircle className="h-4 w-4 mr-1" />{authError}</div>}
        </div>

        {/* Tabs */}
        {isAuthenticated && (
          <div className="px-6 border-b">
            <div className="flex space-x-1">
              {[
                { id: 'upload', label: 'Upload to Drive', icon: Upload },
                { id: 'browse', label: 'Browse Drive', icon: FileText },
                { id: 'manage', label: 'Manage Files', icon: Link }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Icon className="h-4 w-4 mr-2" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Cloud className="h-16 w-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Connect to Google Drive</h4>
              <p className="text-gray-500 mb-6 max-w-md">Connect your Google Drive account to upload, download, and manage your PDF files in the cloud.</p>
              <button onClick={authenticate} disabled={authLoading} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                {authLoading ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <Cloud className="h-5 w-5 mr-2" />}
                {authLoading ? 'Connecting...' : 'Connect to Google Drive'}
              </button>
            </div>
          ) : (
            <>
              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-lg font-medium mb-2">Select PDFs to Upload</h4>
                    <p className="text-gray-500 mb-6">Choose which PDFs from your library to upload to Google Drive</p>
                  </div>

                  {pdfsLoading ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : userPDFs?.data?.pdfs?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="max-h-64 overflow-y-auto border rounded-lg">
                        {userPDFs.data.pdfs.map((pdf) => (
                          <div key={pdf.uuid} className="flex items-center p-4 border-b last:border-b-0 hover:bg-gray-50">
                            <input type="checkbox" id={`pdf-${pdf.uuid}`} checked={selectedPDFs.includes(pdf.uuid)} onChange={(e) => handlePDFSelection(pdf.uuid, e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-3" />
                            <FileText className="h-8 w-8 text-red-500 mr-3" />
                            <div className="flex-1">
                              <label htmlFor={`pdf-${pdf.uuid}`} className="font-medium cursor-pointer">{pdf.originalName}</label>
                              <div className="text-sm text-gray-500">{formatFileSize(pdf.fileSize)} • Created {formatDate(pdf.createdAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">{selectedPDFs.length} of {userPDFs.data.pdfs.length} PDFs selected</div>
                        <button onClick={handleUploadSelected} disabled={uploadMutation.isLoading || selectedPDFs.length === 0} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center">
                          {uploadMutation.isLoading ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <Upload className="h-5 w-5 mr-2" />}
                          {uploadMutation.isLoading ? 'Uploading...' : `Upload Selected (${selectedPDFs.length})`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p>No PDFs found in your library.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Browse Tab */}
              {activeTab === 'browse' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium">Browse Google Drive Files</h4>
                    <button onClick={() => loadDriveFiles()} disabled={listFilesMutation.isLoading} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center">
                      <RefreshCw className={`h-4 w-4 mr-2 ${listFilesMutation.isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {driveFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center flex-1">
                        <FileText className="h-8 w-8 text-red-500 mr-3" />
                        <div className="flex-1">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-gray-500">{formatFileSize(file.size)} • Modified {formatDate(file.modifiedTime)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.webViewLink && (
                          <button onClick={() => window.open(file.webViewLink, '_blank')} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View in Google Drive">
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleImport(file)} disabled={importMutation.isLoading} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center">
                          {importMutation.isLoading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                          Import
                        </button>
                      </div>
                    </div>
                  ))}

                  {driveFiles.length === 0 && !listFilesMutation.isLoading && <div className="text-center py-8 text-gray-500">No PDF files found in Google Drive</div>}
                  {nextPageToken && <div className="text-center pt-4"><button onClick={() => loadDriveFiles(nextPageToken)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Load More</button></div>}
                </div>
              )}

              {/* Manage Tab */}
              {/* Manage Tab - UPDATED */}
{activeTab === 'manage' && (
  <div className="space-y-4">
    <h4 className="text-lg font-medium">Manage Cloud Files</h4>
    
    {cloudFiles?.data?.cloudFiles?.length > 0 ? (
      <div className="space-y-3">
        {cloudFiles.data.cloudFiles.map((file) => (
          <div
            key={file.uuid}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center flex-1">
              <FileText className="h-8 w-8 text-blue-500 mr-3" />
              <div className="flex-1">
                <div className="font-medium">{file.fileName}</div>
                <div className="text-sm text-gray-500">
                  {formatFileSize(file.fileSize)} • Uploaded {formatDate(file.createdAt)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {file.webViewLink && (
                <button
                  onClick={() => window.open(file.webViewLink, '_blank')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="View in Google Drive"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => handleDelete(file.uuid)}
                disabled={deleteMutation.isLoading}
                className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                title="Remove from list"
              >
                {deleteMutation.isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        No cloud files found for this PDF
      </div>
    )}
  </div>
)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudStoragePanel;
