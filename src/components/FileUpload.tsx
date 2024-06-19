import React, { useState } from 'react';
import { useAppDispatch } from '../store/store';
import { setAnimation, updateLoadThrough } from '../store/animationSlice';

const FileUpload: React.FC = () => {
    const dispatch = useAppDispatch();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result;
            if (typeof content === 'string') {
                try {
                    const animationData = JSON.parse(content);
                    dispatch(setAnimation(animationData));
                    dispatch(updateLoadThrough("File"));
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    window.alert('Error parsing JSON. Please try again.');
                }
            }
        };
        reader.readAsText(selectedFile);
    };

    return (
        <div className="file-uploader-container flex my-2">
            <div className="mt-1 mr-2">Please upload a Lottie animation JSON file: </div>
            <div className="flex-5">
                <input className="mr-4 text-sm" type="file" accept=".json" onChange={handleFileChange} />
            </div>
            {selectedFile  && <div className="flex-1 content-center">
                <button className="px-2 py-1 text-sm border border-slate-400 rounded-lg" onClick={handleUpload}>Upload</button>
            </div>}
        </div>
    );
};

export default FileUpload;
