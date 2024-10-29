import React, { useState, useEffect } from 'react';
import FileSaver from 'file-saver';

const App = () => {
  const [files, setFiles] = useState([]);
  const [key, setKey] = useState('');
  const [encryptedFiles, setEncryptedFiles] = useState([]);
  const [quantumEstimate, setQuantumEstimate] = useState('');
  const [encryptionTime, setEncryptionTime] = useState('');
  const [decryptionTime, setDecryptionTime] = useState('');
  const [showDeleteInstruction, setShowDeleteInstruction] = useState(false);
  const [lastActivity, setLastActivity] = useState('');

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    setEncryptedFiles(selectedFiles.filter(file => file.name.endsWith('.enc')));
  };

  const encryptFile = async (file, key) => {
    const encoder = new TextEncoder();
    const encodedKey = encoder.encode(key);
    const hashedKey = await window.crypto.subtle.digest('SHA-256', encodedKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await window.crypto.subtle.importKey('raw', hashedKey, 'AES-GCM', false, ['encrypt']),
      await file.arrayBuffer(),
    );

    // Combine IV and encrypted data into one Uint8Array
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return {
      encryptedData: combined,
      name: file.name // Keep original file name for the encrypted version
    };
  };

  const handleEncrypt = async () => {
    const startTime = performance.now();

    const encryptedResults = await Promise.all(
      files.filter(file => !file.name.endsWith('.enc')).map(file => encryptFile(file, key))
    );

    const endTime = performance.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // in seconds

    // Save encrypted files
    encryptedResults.forEach((encryptedFile) => {
      const blob = new Blob([encryptedFile.encryptedData], { type: 'application/octet-stream' });
      const newFileName = `${encryptedFile.name}.enc`; // Append .enc to avoid conflicts
      FileSaver.saveAs(blob, newFileName); // Save the file using FileSaver
    });

    setEncryptedFiles(encryptedResults);
    setEncryptionTime(`Encryption took ${timeTaken} seconds.`);
    setShowDeleteInstruction(true);
    setLastActivity(`Encrypted ${encryptedResults.length} file(s).`);
    setFiles([]);
    setKey('');
  };

  const decryptFile = async (file, key) => {
    const encoder = new TextEncoder();
    const encodedKey = encoder.encode(key);
    const hashedKey = await window.crypto.subtle.digest('SHA-256', encodedKey);
    
    // Convert file to ArrayBuffer
    const fileData = await file.arrayBuffer();
    const iv = new Uint8Array(fileData.slice(0, 12)); // First 12 bytes are the IV
    const encryptedData = new Uint8Array(fileData.slice(12)); // The rest is the encrypted data

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await window.crypto.subtle.importKey('raw', hashedKey, 'AES-GCM', false, ['decrypt']),
      encryptedData
    );

    return new Blob([decryptedData], { type: 'application/octet-stream' });
  };

  const handleDecrypt = async () => {
    const startTime = performance.now();

    const decryptedResults = await Promise.all(
      encryptedFiles.map(file => decryptFile(file, key))
    );

    decryptedResults.forEach((blob, index) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = encryptedFiles[index].name.replace('.enc', ''); // Remove .enc for original name
      link.click();
    });

    const endTime = performance.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // in seconds
    setDecryptionTime(`Decryption took ${timeTaken} seconds.`);
    setLastActivity(`Decrypted ${decryptedResults.length} file(s).`);
    setFiles([]);
    setKey('');
  };

  useEffect(() => {
    const calculateQuantumEstimate = () => {
      const totalFileSize = files.reduce((acc, file) => acc + file.size, 0);
      const keyLength = key.length;
      const years = Math.ceil((totalFileSize / 1024 / 1024) * 10 + keyLength);
      setQuantumEstimate(`This would take approximately ${years} years for a quantum computer to decode.`);
    };

    calculateQuantumEstimate();
  }, [files, key]);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="bg-gray-800 w-full py-4 flex justify-center items-center">
        <span className="text-2xl font-bold">🇮🇳 Secure File Encryption</span>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center">
        <input 
          type="file" 
          multiple 
          accept=".enc,image/*,video/*,audio/*" 
          onChange={handleFileChange} 
          className="mb-4 p-2 bg-gray-800 border border-gray-700 rounded-md" 
        />
        <input
          type="text"
          placeholder="Enter your encryption key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mb-4 p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
        />
        {files.some(file => !file.name.endsWith('.enc')) ? (
          <button 
            onClick={handleEncrypt} 
            className="mb-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200"
          >
            Encrypt Files
          </button>
        ) : (
          <button 
            onClick={handleDecrypt} 
            className="mb-4 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md transition duration-200"
          >
            Decrypt Files
          </button>
        )}
        {quantumEstimate && (
          <p className="mt-4 text-lg italic">{quantumEstimate}</p>
        )}
        {encryptionTime && (
          <p className="mt-4 text-lg italic">{encryptionTime}</p>
        )}
        {decryptionTime && (
          <p className="mt-4 text-lg italic">{decryptionTime}</p>
        )}
        {lastActivity && (
          <p className="mt-4 text-lg italic">{lastActivity}</p>
        )}
        {showDeleteInstruction && (
          <p className="mt-4 text-lg">Please remember to delete the original files from your system.</p>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 w-full py-4 text-center">
        <p className="text-lg">Made with ❤️ by Marmik Mewada to keep your extremely private files secured.</p>
        <p className="text-sm">Contact: paraboyyy1704@gmail.com</p>
        <p className="text-sm">Services: Android, iOS, Web, Scraping, Cyber Security, Spying Tools, Prompt Training, IoT Staff Training</p>
      </footer>
    </div>
  );
};

export default App;
