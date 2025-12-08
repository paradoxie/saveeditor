import React, { useState } from 'react';
import FileUpload from './FileUpload';
import SaveEditor from './SaveEditor';

interface EditorAppProps {
    acceptedFileTypes?: string;
}

export default function EditorApp({ acceptedFileTypes }: EditorAppProps) {
    const [file, setFile] = useState<File | null>(null);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [unsupportedFile, setUnsupportedFile] = useState<File | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        console.log('File selected:', selectedFile.name);
        console.log('Accepted types:', acceptedFileTypes);

        if (!acceptedFileTypes) {
            setFile(selectedFile);
            return;
        }

        const allowedExtensions = acceptedFileTypes.split(',').map(ext => ext.trim().toLowerCase());
        const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

        console.log('Allowed extensions:', allowedExtensions);
        console.log('File extension:', fileExtension);
        console.log('Is allowed:', allowedExtensions.includes(fileExtension));

        if (allowedExtensions.includes(fileExtension)) {
            console.log('File accepted, setting file');
            setFile(selectedFile);
        } else {
            console.log('File rejected, showing modal');
            setUnsupportedFile(selectedFile);
            setErrorModalOpen(true);
        }
    };

    // Prevent browser from opening files when dropped outside the drop zone
    React.useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
        };

        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    const handleDemo = () => {
        const sampleData = {
            "gold": 99999,
            "level": 99,
            "name": "Hero",
            "items": [
                { "id": 1, "name": "Potion", "count": 10 },
                { "id": 2, "name": "Sword", "equipped": true }
            ],
            "stats": {
                "hp": 1000,
                "mp": 500,
                "str": 255,
                "def": 200
            },
            "flags": {
                "boss_defeated": true,
                "chest_opened": false
            }
        };

        const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
        const demoFile = new File([blob], "demo_save.json", { type: 'application/json' });
        setFile(demoFile);
    };

    if (!file) {
        return (
            <div className="space-y-8">
                {/* No accept attribute - allow all files for manual validation */}
                <FileUpload onFileSelect={handleFileSelect} />

                <div className="text-center">
                    <p className="text-gray-500 mb-4 text-sm">Don't have a file handy?</p>
                    <button
                        onClick={handleDemo}
                        className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Try Demo Save
                    </button>
                </div>

                {/* Error Modal */}
                {errorModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setErrorModalOpen(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            File Type Not Supported
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                You uploaded <strong>{unsupportedFile?.name}</strong>, but this editor currently only supports:
                                            </p>
                                            <p className="mt-2 text-sm font-mono bg-gray-100 p-2 rounded">
                                                {acceptedFileTypes}
                                            </p>
                                            <p className="mt-4 text-sm text-gray-500">
                                                Would you like to request support for this file type?
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                    <a
                                        href={`mailto:support@saveeditor.online?subject=Request Support for ${unsupportedFile?.name}&body=I would like to request support for the file type: ${unsupportedFile?.name.split('.').pop()}.%0D%0A%0D%0AAttached is a sample file (please attach your file manually).`}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => setErrorModalOpen(false)}
                                    >
                                        Request Support via Email
                                    </a>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                                        onClick={() => setErrorModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <SaveEditor file={file} onBack={() => setFile(null)} />;
}
