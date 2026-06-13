{
// import { useState } from 'react';
// import './CreateModal.css';

// export default function CreateModal({ isOpen, onClose }) {
//     const [selectedFile, setSelectedFile] = useState(null);
//     const [uploadStep, setUploadStep] = useState('select'); // select, uploading, details

//     if (!isOpen) return null;

//     const handleFileSelect = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             setSelectedFile(file);
//             setUploadStep('details');
//         }
//     };

//     const handleDragOver = (e) => {
//         e.preventDefault();
//     };

//     const handleDrop = (e) => {
//         e.preventDefault();
//         const file = e.dataTransfer.files[0];
//         if (file && file.type.startsWith('video/')) {
//             setSelectedFile(file);
//             setUploadStep('details');
//         }
//     };

//     return (
//         <>
//             <div className="create-modal-backdrop" onClick={onClose}></div>
            
//             <div className="create-modal">
//                 <div className="create-modal-header">
//                     <h2>Upload video</h2>
//                     <button className="create-modal-close" onClick={onClose}>✕</button>
//                 </div>

//                 {uploadStep === 'select' && (
//                     <div 
//                         className="create-upload-area"
//                         onDragOver={handleDragOver}
//                         onDrop={handleDrop}
//                     >
//                         <div className="upload-icon">📤</div>
//                         <h3>Drag and drop video files to upload</h3>
//                         <p>Your videos will be private until you publish them.</p>
                        
//                         <label htmlFor="file-upload" className="upload-select-btn">
//                             SELECT FILES
//                         </label>
//                         <input 
//                             id="file-upload" 
//                             type="file" 
//                             accept="video/*"
//                             onChange={handleFileSelect}
//                             style={{ display: 'none' }}
//                         />
//                     </div>
//                 )}

//                 {uploadStep === 'details' && selectedFile && (
//                     <div className="create-details-form">
//                         <div className="upload-preview">
//                             <div className="preview-video">
//                                 <span>📹</span>
//                                 <p>{selectedFile.name}</p>
//                             </div>
//                         </div>

//                         <form className="video-details-form">
//                             <div className="form-group">
//                                 <label htmlFor="title">Title (required)</label>
//                                 <input 
//                                     type="text" 
//                                     id="title" 
//                                     placeholder="Add a title that describes your video"
//                                     maxLength="100"
//                                 />
//                             </div>

//                             <div className="form-group">
//                                 <label htmlFor="description">Description</label>
//                                 <textarea 
//                                     id="description" 
//                                     rows="6"
//                                     placeholder="Tell viewers about your video"
//                                     maxLength="5000"
//                                 ></textarea>
//                             </div>

//                             <div className="form-group">
//                                 <label htmlFor="thumbnail">Thumbnail</label>
//                                 <input type="file" id="thumbnail" accept="image/*" />
//                             </div>

//                             <div className="form-group">
//                                 <label htmlFor="visibility">Visibility</label>
//                                 <select id="visibility">
//                                     <option value="private">Private</option>
//                                     <option value="unlisted">Unlisted</option>
//                                     <option value="public">Public</option>
//                                 </select>
//                             </div>

//                             <div className="form-actions">
//                                 <button type="button" className="btn-cancel" onClick={onClose}>
//                                     Cancel
//                                 </button>
//                                 <button type="submit" className="btn-upload">
//                                     Upload
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 )}
//             </div>
//         </>
//     );
// }
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateModal.css';

export default function CreateModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState(null);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            // Redirect to upload page with file
            navigate('/upload', { state: { videoFile: file } });
            onClose(); // Close modal
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            // Redirect to upload page with file
            navigate('/upload', { state: { videoFile: file } });
            onClose(); // Close modal
        }
    };

    return (
        <>
            <div className="create-modal-backdrop" onClick={onClose}></div>
            
            <div className="create-modal">
                <div className="create-modal-header">
                    <h2>Upload video</h2>
                    <button className="create-modal-close" onClick={onClose}>✕</button>
                </div>

                <div 
                    className="create-upload-area"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="upload-icon">📤</div>
                    <h3>Drag and drop video files to upload</h3>
                    <p>Your videos will be private until you publish them</p>
                    
                    <label htmlFor="file-upload" className="upload-select-btn">
                        SELECT FILES
                    </label>
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept="video/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            </div>
        </>
    );
}